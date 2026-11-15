"""Visual analysis service for OCR, brand color compliance, and contrast checks."""

import io
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import cv2
from PIL import Image
import structlog

logger = structlog.get_logger(__name__)


def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Extract visible text from image bytes using PyTesseract OCR.
    Gracefully handles environments without local tesseract binary.
    """
    try:
        import pytesseract
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        logger.warning("PyTesseract OCR execution failed or tesseract binary not found", error=str(e))
        return ""


def _hex_to_rgb(hex_code: str) -> Tuple[int, int, int]:
    """Convert hex string '#RRGGBB' to RGB tuple."""
    hex_clean = hex_code.lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    return int(hex_clean[0:2], 16), int(hex_clean[2:4], 16), int(hex_clean[4:6], 16)


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    """Convert RGB integers to hex string."""
    return f"#{int(r):02X}{int(g):02X}{int(b):02X}"


def extract_dominant_colors(image_bytes: bytes, k: int = 5) -> List[Dict[str, Any]]:
    """
    Extract top K dominant colors using OpenCV k-means clustering.
    Returns list of dicts with 'hex', 'rgb', and 'percentage'.
    """
    try:
        # Load image via OpenCV
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            # Fallback via PIL
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

        # Resize for fast clustering
        img_small = cv2.resize(img, (150, 150), interpolation=cv2.INTER_AREA)
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img_small, cv2.COLOR_BGR2RGB)
        pixels = img_rgb.reshape((-1, 3)).astype(np.float32)

        # OpenCV KMeans
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        flags = cv2.KMEANS_RANDOM_CENTERS
        compactness, labels, centers = cv2.kmeans(pixels, k, None, criteria, 10, flags)

        # Count frequencies
        unique_labels, counts = np.unique(labels, return_counts=True)
        total_pixels = len(pixels)

        dominant_colors = []
        for label, count in zip(unique_labels, counts):
            rgb = centers[label]
            hex_str = _rgb_to_hex(rgb[0], rgb[1], rgb[2])
            dominant_colors.append({
                "hex": hex_str,
                "rgb": [int(rgb[0]), int(rgb[1]), int(rgb[2])],
                "percentage": round((count / total_pixels) * 100, 1),
            })

        # Sort by percentage descending
        dominant_colors.sort(key=lambda x: x["percentage"], reverse=True)
        return dominant_colors
    except Exception as e:
        logger.error("Error extracting dominant colors", error=str(e))
        return []


def check_color_compliance(
    extracted_colors: List[Dict[str, Any]],
    brand_palette: List[str],
    tolerance: float = 40.0,
) -> Dict[str, Any]:
    """
    Compare extracted image dominant colors against approved brand color palette.
    Euclidean distance in RGB space <= tolerance is considered compliant.
    """
    if not brand_palette:
        return {"compliant": True, "details": "No brand palette specified."}

    brand_rgbs = []
    for hex_code in brand_palette:
        try:
            brand_rgbs.append(_hex_to_rgb(hex_code))
        except Exception:
            continue

    matched = []
    unmatched = []

    for item in extracted_colors:
        rgb = np.array(item["rgb"])
        closest_dist = float("inf")
        closest_brand = None

        for b_hex, b_rgb in zip(brand_palette, brand_rgbs):
            dist = np.linalg.norm(rgb - np.array(b_rgb))
            if dist < closest_dist:
                closest_dist = dist
                closest_brand = b_hex

        if closest_dist <= tolerance:
            matched.append({
                "extracted_hex": item["hex"],
                "matched_brand_hex": closest_brand,
                "distance": round(float(closest_dist), 1),
                "percentage": item["percentage"],
            })
        else:
            unmatched.append({
                "extracted_hex": item["hex"],
                "closest_brand_hex": closest_brand,
                "distance": round(float(closest_dist), 1),
                "percentage": item["percentage"],
            })

    is_compliant = len(unmatched) == 0 or sum(u["percentage"] for u in unmatched) < 20.0
    return {
        "compliant": is_compliant,
        "matched_colors": matched,
        "unmatched_colors": unmatched,
        "coverage_percentage": round(sum(m["percentage"] for m in matched), 1),
    }


def compare_images(image1_bytes: bytes, image2_bytes: bytes) -> float:
    """
    Compute visual similarity score (0.0 to 1.0) using normalized histogram correlation.
    """
    try:
        img1 = cv2.imdecode(np.frombuffer(image1_bytes, np.uint8), cv2.IMREAD_COLOR)
        img2 = cv2.imdecode(np.frombuffer(image2_bytes, np.uint8), cv2.IMREAD_COLOR)

        if img1 is None or img2 is None:
            return 0.0

        # Resize to standard dimension
        img1 = cv2.resize(img1, (256, 256))
        img2 = cv2.resize(img2, (256, 256))

        # Convert to HSV and calculate histograms
        hsv1 = cv2.cvtColor(img1, cv2.COLOR_BGR2HSV)
        hsv2 = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)

        hist1 = cv2.calcHist([hsv1], [0, 1], None, [50, 60], [0, 180, 0, 256])
        hist2 = cv2.calcHist([hsv2], [0, 1], None, [50, 60], [0, 180, 0, 256])

        cv2.normalize(hist1, hist1, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

        similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        return max(0.0, min(1.0, round(float(similarity), 3)))
    except Exception as e:
        logger.error("Error comparing images", error=str(e))
        return 0.0


def analyze_contrast(image_bytes: bytes) -> Dict[str, Any]:
    """
    Evaluate average relative luminance and local contrast accessibility.
    Returns contrast ratio estimate and WCAG AA compliance indication.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("L")
        np_gray = np.array(img, dtype=np.float32) / 255.0

        # Standard deviation as measure of overall contrast
        contrast_std = float(np.std(np_gray))
        p5 = float(np.percentile(np_gray, 5))
        p95 = float(np.percentile(np_gray, 95))

        # Approximate dynamic contrast ratio
        lum_min = p5 + 0.05
        lum_max = p95 + 0.05
        ratio = round(lum_max / lum_min, 2)

        wcag_compliant = ratio >= 4.5
        return {
            "estimated_contrast_ratio": f"{ratio}:1",
            "contrast_ratio": ratio,
            "standard_deviation": round(contrast_std, 3),
            "wcag_aa_compliant": wcag_compliant,
            "recommendation": (
                "Contrast satisfies WCAG AA 4.5:1 ratio standard."
                if wcag_compliant
                else "Increase contrast between foreground elements and background."
            ),
        }
    except Exception as e:
        logger.error("Contrast analysis failed", error=str(e))
        return {
            "estimated_contrast_ratio": "Unknown",
            "contrast_ratio": 0.0,
            "wcag_aa_compliant": True,
            "error": str(e),
        }


async def analyze_visual_creative(
    image_bytes: bytes,
    brand_palette: Optional[List[str]] = None,
    brand_guidelines_text: Optional[str] = None,
    brand_assets: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Comprehensive brand creative audit combining OpenCV color & contrast metrics
    with Google Gemini Multimodal Vision analysis.
    """
    import asyncio
    import json
    from app.core.config import get_settings

    settings = get_settings()
    visual_findings: List[Dict[str, Any]] = []

    # Normalize palette whether passed as strings or rule dicts
    clean_palette: List[str] = []
    if brand_palette:
        for p in brand_palette:
            if isinstance(p, dict):
                val = p.get("value") or p.get("color") or ""
                if val:
                    clean_palette.append(str(val))
            elif isinstance(p, str):
                clean_palette.append(p)

    # 1. Deterministic Color Extraction
    dominant_colors = extract_dominant_colors(image_bytes, k=5)
    color_report = check_color_compliance(dominant_colors, clean_palette)

    if clean_palette and not color_report.get("compliant", True):
        unmatched_hexes = [u["extracted_hex"] for u in color_report.get("unmatched_colors", [])]
        visual_findings.append({
            "category": "Visual Inconsistency",
            "severity": "medium",
            "original_text": f"Dominant colors: {', '.join(unmatched_hexes[:3])}",
            "explanation": f"Creative uses prominent colors that deviate from the approved brand palette ({', '.join(clean_palette)}).",
            "guideline_reference": "Brand Color Palette Specification",
            "evidence": f"Approved brand colors: {', '.join(clean_palette)}. Unmatched colors represent {100 - color_report.get('coverage_percentage', 100)}% of the visual space.",
            "source_document": "Brand Visual Guidelines",
            "source_page": 1,
            "suggested_correction": f"Adjust color grading or background accents to align with brand colors ({', '.join(clean_palette[:3])}).",
            "confidence": 0.90,
            "engine": "opencv_rule_engine",
        })

    # 2. Contrast & Accessibility Analysis
    contrast_report = analyze_contrast(image_bytes)
    if not contrast_report.get("wcag_aa_compliant", True):
        visual_findings.append({
            "category": "Accessibility Issue",
            "severity": "medium",
            "original_text": f"Estimated visual contrast: {contrast_report.get('estimated_contrast_ratio', 'low')}",
            "explanation": "Image contrast appears insufficient for optimal legibility, falling below WCAG AA recommended ratio of 4.5:1.",
            "guideline_reference": "Digital Accessibility & Visual Standards",
            "evidence": f"Luminance standard deviation: {contrast_report.get('standard_deviation')}. Contrast ratio: {contrast_report.get('estimated_contrast_ratio')}.",
            "source_document": "Brand Accessibility Guidelines",
            "source_page": 1,
            "suggested_correction": "Increase visual separation and luminance difference between foreground text and underlying imagery.",
            "confidence": 0.85,
            "engine": "opencv_rule_engine",
        })

    # 3. Multimodal Google Gemini Vision Analysis
    gemini_vision_used = False
    if settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-2.5-flash")

            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            palette_str = ", ".join(clean_palette) if clean_palette else "None specified (evaluate general aesthetic harmony)"
            guidelines_str = brand_guidelines_text or "Standard enterprise brand safety: professional typography, clean layout, respectful imagery, no deceptive visual cues."
            assets_str = ", ".join(a.get("name", "Asset") for a in (brand_assets or [])) if brand_assets else "No registered logo asset files uploaded."

            prompt = f"""You are the Visual Brand Identity and Safety Inspector for BrandShield AI.
Inspect this uploaded marketing creative image against the brand's visual identity requirements.

Approved Brand Colors: {palette_str}
Registered Brand Assets: {assets_str}
Visual Guidelines:
{guidelines_str}

Evaluate:
1. Logo usage, clearspace, and proportion (is the brand identifiable or distorted?)
2. Color palette consistency with brand guidelines
3. Embedded text legibility, typography hierarchy, and any misleading claims in the graphic
4. Visual messaging, imagery appropriateness, and composition layout
5. Accessibility (contrast, readable text sizing)

Return a JSON array of finding objects. For each visual issue found, include:
- "category": One of "Visual Inconsistency", "Accessibility Issue", "Unsupported Claim", "Brand Voice Deviation", "Tone Inconsistency"
- "severity": "critical", "high", "medium", or "low"
- "original_text": Description or quote of the specific visual element (e.g. 'Headline banner text: ...', 'Top-left logo clearspace', 'Background gradient')
- "explanation": Specific explanation of why this visual design compromises brand identity
- "guideline_reference": The relevant visual design principle
- "evidence": Specific visual cue observed in the image
- "suggested_correction": Actionable design recommendation for the graphic designer
- "confidence": Float between 0.70 and 0.98

If the image is fully compliant with no visual brand defects, return [].
Return ONLY valid JSON array."""

            res = await asyncio.wait_for(
                model.generate_content_async(
                    [prompt, pil_img],
                    generation_config=genai.GenerationConfig(
                        temperature=0.15,
                        response_mime_type="application/json",
                        max_output_tokens=4096,
                    ),
                ),
                timeout=25.0,
            )

            raw_txt = res.text or "[]"
            cleaned = raw_txt.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            try:
                gemini_findings = json.loads(cleaned)
            except json.JSONDecodeError:
                # Attempt to recover truncated JSON array
                last_brace = cleaned.rfind("}")
                if last_brace != -1:
                    repaired = cleaned[:last_brace + 1] + "]"
                    gemini_findings = json.loads(repaired)
                else:
                    gemini_findings = []

            if isinstance(gemini_findings, list):
                for f in gemini_findings:
                    f["engine"] = "gemini"
                    visual_findings.append(f)
                gemini_vision_used = True
        except Exception as e:
            logger.warning("Gemini Vision analysis failed or timed out", error=str(e))

    return {
        "status": "analyzed",
        "visual_findings": visual_findings,
        "findings": visual_findings,
        "dominant_colors": dominant_colors,
        "color_compliance": color_report,
        "contrast_analysis": contrast_report,
        "gemini_vision_analyzed": gemini_vision_used,
    }

