"""Audit service orchestrator combining deterministic rules, vector retrieval, and LLM analysis."""

import time
import uuid
import os
from typing import List, Dict, Any, Optional
import structlog
from fastapi import HTTPException, status

from app.database.client import (
    fetch_one,
    fetch_all,
    insert_row,
    update_row,
)
from app.schemas.audit import (
    AuditReport,
    ComplianceFinding,
    Severity,
    FindingCategory,
    FindingStatus,
)
from app.services.rule_engine import RuleEngine
from app.services.retrieval_service import retrieve_relevant_chunks
from app.services.llm_analyzer import LLMAnalyzer
from app.services.visual_analyzer import analyze_visual_creative

logger = structlog.get_logger(__name__)


def calculate_compliance_score(findings: List[Dict[str, Any]]) -> float:
    """
    Calculate an overall compliance score (0-100) based on severity weights:
    - Critical: -25
    - High: -15
    - Medium: -8
    - Low: -3
    - Informational: -1
    """
    score = 100.0
    penalties = {
        "critical": 25.0,
        "high": 15.0,
        "medium": 8.0,
        "low": 3.0,
        "informational": 1.0,
    }

    for f in findings:
        sev = str(f.get("severity", "low")).lower()
        score -= penalties.get(sev, 3.0)

    return max(0.0, min(100.0, round(score, 1)))


def deduplicate_findings(findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deduplicate overlapping findings between deterministic rules, visual analysis, and LLM insights.
    If original_text and category match, keeps the higher confidence finding.
    """
    seen = {}
    deduped = []

    for f in findings:
        text_key = f.get("original_text", "").strip().lower()[:50]
        cat_key = f.get("category", "").strip().lower()
        key = (text_key, cat_key)

        if key in seen:
            existing_idx = seen[key]
            if f.get("confidence", 0) > deduped[existing_idx].get("confidence", 0):
                deduped[existing_idx] = f
        else:
            seen[key] = len(deduped)
            deduped.append(f)

    return deduped


def generate_audit_summary(score: float, counts: Dict[str, int], engine: str = "gemini") -> str:
    """Produce an executive audit narrative summary with engine attribution."""
    total = sum(counts.values())
    engine_name = "Google Gemini" if engine == "gemini" else ("OpenAI" if engine == "openai" else "Rule & Heuristic Engine")

    if total == 0:
        return f"Audit completed with 100% compliance via {engine_name}. No terminology violations, voice deviations, or factual discrepancies detected."

    lines = [
        f"Audit completed with an overall brand compliance score of {score}/100 via {engine_name}. "
        f"A total of {total} finding{'s were' if total > 1 else ' was'} identified."
    ]

    breakdown = []
    if counts.get("critical", 0):
        breakdown.append(f"{counts['critical']} critical")
    if counts.get("high", 0):
        breakdown.append(f"{counts['high']} high priority")
    if counts.get("medium", 0):
        breakdown.append(f"{counts['medium']} medium priority")
    if counts.get("low", 0):
        breakdown.append(f"{counts['low']} low priority")
    if counts.get("informational", 0):
        breakdown.append(f"{counts['informational']} informational")

    if breakdown:
        lines.append(f"Severity breakdown: {', '.join(breakdown)}.")

    if counts.get("critical", 0) > 0 or counts.get("high", 0) > 0:
        lines.append("Action required: Resolve all critical and high severity findings prior to publishing or campaign launch.")
    else:
        lines.append("Recommendations: Review suggested terminology and style adjustments to align with brand guidelines.")

    return " ".join(lines)


async def run_audit(
    content_id: str,
    org_id: str,
    client: Optional[Any] = None,
) -> AuditReport:
    """
    Run full end-to-end brand compliance audit on a content submission:
    1. Fetch content from database (strict 404 if not found, authorization check)
    2. Retrieve brand rules (terminology, mandatory disclosures, voice, facts, colors)
    3. Run RuleEngine for deterministic terminology and mandatory messages
    4. Retrieve semantic context chunks from guideline vectors strictly scoped to org
    5. Run LLMAnalyzer (Google Gemini primary) for tone, voice, and claim compliance
    6. If image/creative present, run VisualAnalyzer (OpenCV + Gemini Vision)
    7. Merge & deduplicate findings
    8. Calculate explainable compliance score and severity breakdown
    9. Persist audit report and findings with engine metadata
    10. Emit audit event for real-time analytics
    """
    start_time = time.time()

    # 1. Fetch content from DB (Strict check - no fake content fallback)
    content_record = fetch_one("content_submissions", {"id": content_id})
    if not content_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )

    # Security check: verify organisation ownership
    if content_record.get("organisation_id") != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Content submission does not belong to the requested organisation",
        )

    content_text = content_record.get("current_content") or content_record.get("original_content", "")
    content_category = content_record.get("category", "marketing_campaign")
    content_type = content_record.get("content_type", "text")

    # 2. Get active brand rules for org
    rules = fetch_all("brand_rules", {"organisation_id": org_id, "is_active": True})

    # 3. Run Rule Engine for deterministic checks
    rule_engine = RuleEngine()
    rule_findings = await rule_engine.analyze(content_text, rules)

    # 4. Extract Voice, Facts, Colors, and Assets from rules
    approved_facts = [
        f"{r.get('name')}: {r.get('value')}"
        for r in rules if r.get("rule_type") in ("approved_fact", "fact")
    ]
    brand_voice_parts = [
        f"{r.get('name')}: {r.get('value')}. {r.get('description', '')}"
        for r in rules if r.get("rule_type") in ("brand_voice", "tone")
    ]
    brand_voice = "\n".join(brand_voice_parts) if brand_voice_parts else None

    brand_colors = [
        r.get("value")
        for r in rules if r.get("rule_type") in ("brand_color", "color") and r.get("value")
    ]
    brand_assets = fetch_all("brand_assets", {"organisation_id": org_id})

    # 5. Semantic Guideline Retrieval (RAG)
    retrieved_chunks = await retrieve_relevant_chunks(org_id, content_text, top_k=5)

    # 6. Primary LLM Analysis (Google Gemini Core Intelligence)
    llm_analyzer = LLMAnalyzer()
    engine_meta = llm_analyzer.get_engine_metadata()
    llm_findings = await llm_analyzer.analyze_content(
        content_text=content_text,
        content_category=content_category,
        brand_context=retrieved_chunks,
        brand_voice=brand_voice,
        approved_facts=approved_facts,
    )

    # 7. Visual Analysis for Image Creatives (if image file exists)
    visual_findings: List[Dict[str, Any]] = []
    file_url = content_record.get("file_url")
    if content_type == "image" or (file_url and any(file_url.lower().endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".webp"))):
        try:
            # Check if file exists locally on disk
            img_bytes = None
            if file_url and os.path.exists(file_url):
                with open(file_url, "rb") as f:
                    img_bytes = f.read()

            if img_bytes:
                guidelines_summary = "\n".join(c.get("content", "") for c in retrieved_chunks)
                v_res = await analyze_visual_creative(
                    image_bytes=img_bytes,
                    brand_palette=brand_colors,
                    brand_guidelines_text=guidelines_summary,
                    brand_assets=brand_assets,
                )
                visual_findings = v_res.get("visual_findings", [])
        except Exception as e:
            logger.warning("Visual analysis on image creative skipped or failed", error=str(e))

    # 8. Merge and deduplicate all findings
    all_raw_findings = rule_findings + llm_findings + visual_findings
    deduped_raw = deduplicate_findings(all_raw_findings)

    # 9. Calculate score and counts
    overall_score = calculate_compliance_score(deduped_raw)

    counts = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "informational": 0,
    }

    for f in deduped_raw:
        sev = str(f.get("severity", "low")).lower()
        if sev in counts:
            counts[sev] += 1
        else:
            counts["low"] += 1

    duration = round(time.time() - start_time, 2)
    report_engine = engine_meta.get("engine", "gemini")
    ai_model = engine_meta.get("model")
    is_ai_powered = engine_meta.get("is_ai_powered", True)

    summary_text = generate_audit_summary(overall_score, counts, engine=report_engine)
    audit_id = str(uuid.uuid4())

    # 10. Format ComplianceFinding objects
    findings_models: List[ComplianceFinding] = []
    finding_insert_rows: List[Dict[str, Any]] = []

    for item in deduped_raw:
        fid = item.get("id") or str(uuid.uuid4())
        sev_str = str(item.get("severity", "low")).lower()
        try:
            sev_enum = Severity(sev_str)
        except ValueError:
            sev_enum = Severity.LOW

        finding_obj = ComplianceFinding(
            id=fid,
            audit_id=audit_id,
            content_id=content_id,
            category=item.get("category", "Brand Voice Deviation"),
            severity=sev_enum,
            original_text=item.get("original_text", ""),
            explanation=item.get("explanation", ""),
            guideline_reference=item.get("guideline_reference"),
            evidence=item.get("evidence"),
            source_document=item.get("source_document"),
            source_page=item.get("source_page"),
            suggested_correction=item.get("suggested_correction"),
            confidence=float(item.get("confidence", 0.8)),
            status=FindingStatus.OPEN,
            engine=item.get("engine", report_engine),
        )
        findings_models.append(finding_obj)

        finding_insert_rows.append({
            "id": fid,
            "audit_id": audit_id,
            "content_id": content_id,
            "category": finding_obj.category,
            "severity": finding_obj.severity.value,
            "original_text": finding_obj.original_text,
            "explanation": finding_obj.explanation,
            "guideline_reference": finding_obj.guideline_reference,
            "evidence": finding_obj.evidence,
            "source_document": finding_obj.source_document,
            "source_page": finding_obj.source_page,
            "suggested_correction": finding_obj.suggested_correction,
            "confidence": finding_obj.confidence,
            "status": finding_obj.status.value,
            "engine": finding_obj.engine,
        })

    # 11. Persist AuditReport to database
    report_dict = {
        "id": audit_id,
        "content_id": content_id,
        "organisation_id": org_id,
        "overall_score": overall_score,
        "total_findings": len(findings_models),
        "critical_count": counts["critical"],
        "high_count": counts["high"],
        "medium_count": counts["medium"],
        "low_count": counts["low"],
        "info_count": counts["informational"],
        "summary": summary_text,
        "engine": report_engine,
        "is_ai_powered": is_ai_powered,
        "ai_model": ai_model,
        "processing_time_seconds": duration,
    }

    try:
        insert_row("audit_reports", report_dict)
        for f_row in finding_insert_rows:
            insert_row("compliance_findings", f_row)

        update_row("content_submissions", {"id": content_id}, {"status": "audited"})

        insert_row(
            "audit_events",
            {
                "id": str(uuid.uuid4()),
                "organisation_id": org_id,
                "event_type": "content_audited",
                "event_data": {
                    "content_id": content_id,
                    "audit_id": audit_id,
                    "score": overall_score,
                    "findings_count": len(findings_models),
                    "engine": report_engine,
                },
            },
        )
    except Exception as e:
        logger.error("Failed to save audit report or findings to database", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist audit report to database: {str(e)}",
        )

    return AuditReport(
        id=audit_id,
        content_id=content_id,
        organisation_id=org_id,
        overall_score=overall_score,
        total_findings=len(findings_models),
        critical_count=counts["critical"],
        high_count=counts["high"],
        medium_count=counts["medium"],
        low_count=counts["low"],
        info_count=counts["informational"],
        findings=findings_models,
        summary=summary_text,
        engine=report_engine,
        is_ai_powered=is_ai_powered,
        ai_model=ai_model,
        processing_time_seconds=duration,
    )
