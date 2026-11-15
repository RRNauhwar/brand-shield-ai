"""Deterministic rule-based compliance engine.
Checks content against configured brand rules without using LLM.
"""

import re
from typing import List, Dict, Any, Optional
import structlog

logger = structlog.get_logger(__name__)


class RuleEngine:
    """Evaluates text against deterministic brand rules."""

    def __init__(self):
        pass

    async def analyze(self, content_text: str, rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Run all rule-based checks against content."""
        findings: List[Dict[str, Any]] = []

        if not content_text or not rules:
            return findings

        for rule in rules:
            if not rule.get("is_active", True):
                continue

            rt = rule.get("rule_type", "").lower()
            if rt in ("terminology_preferred", "preferred_terminology"):
                findings.extend(self._check_preferred_terminology(content_text, rule))
            elif rt in ("terminology_prohibited", "prohibited_terminology", "prohibited_claim", "prohibited_term"):
                findings.extend(self._check_prohibited_terminology(content_text, rule))
            elif rt in ("mandatory_message", "mandatory_disclosure"):
                findings.extend(self._check_mandatory_message(content_text, rule))
            elif rt in ("approved_fact", "fact"):
                findings.extend(self._check_approved_facts(content_text, rule))
            elif rt in ("brand_voice", "tone"):
                findings.extend(self._check_brand_voice(content_text, rule))
            elif rt in ("brand_color", "color"):
                findings.extend(self._check_brand_colors(content_text, rule))

        return findings

    def _compile_pattern(self, term: str) -> re.Pattern:
        """Compile a regex pattern with word boundaries if term consists of alphanumeric characters."""
        escaped = re.escape(term)
        if term and (term[0].isalnum() or term[-1].isalnum()):
            pattern_str = rf"(?<!\w){escaped}(?!\w)"
        else:
            pattern_str = escaped
        return re.compile(pattern_str, re.IGNORECASE)

    def _extract_context(self, text: str, start: int, end: int, window: int = 50) -> str:
        """Extract surrounding sentence or window context."""
        ctx_start = max(0, start - window)
        ctx_end = min(len(text), end + window)
        return text[ctx_start:ctx_end].strip()

    def _check_preferred_terminology(self, text: str, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check if deprecated terms are used instead of preferred ones."""
        findings = []
        deprecated = rule.get("value", "").strip()
        preferred = rule.get("replacement", "").strip()

        if not deprecated:
            return findings

        pattern = self._compile_pattern(deprecated)
        for match in pattern.finditer(text):
            context = self._extract_context(text, match.start(), match.end())
            matched_exact = match.group()

            # Generate suggested replacement preserving context
            suggested = text[max(0, match.start() - 30):match.start()] + preferred + text[match.end():min(len(text), match.end() + 30)]

            findings.append({
                "category": "Terminology Violation",
                "severity": "medium",
                "original_text": context,
                "explanation": (
                    f'The term "{matched_exact}" should be replaced with "{preferred}" '
                    f'per brand terminology guidelines.'
                ),
                "guideline_reference": f"Terminology Rule: Use '{preferred}' instead of '{deprecated}'",
                "evidence": f"Brand terminology rule #{rule.get('id', 'N/A')}: {rule.get('name', 'Preferred Terminology')}",
                "suggested_correction": context.replace(matched_exact, preferred),
                "confidence": 0.95,
                "engine": "rule_engine",
            })

        return findings

    def _check_prohibited_terminology(self, text: str, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for strictly prohibited terms."""
        findings = []
        prohibited = rule.get("value", "").strip()

        if not prohibited:
            return findings

        pattern = self._compile_pattern(prohibited)
        for match in pattern.finditer(text):
            context = self._extract_context(text, match.start(), match.end())
            matched_exact = match.group()
            description = rule.get("description") or "Prohibited terminology under brand safety rules."

            findings.append({
                "category": "Prohibited Term",
                "severity": "high",
                "original_text": context,
                "explanation": f'The term "{matched_exact}" is prohibited per brand guidelines. {description}',
                "guideline_reference": f"Prohibited Term: '{prohibited}'",
                "evidence": f"Brand rule: {description}",
                "suggested_correction": rule.get("replacement") or None,
                "confidence": 0.98,
                "engine": "rule_engine",
            })

        return findings

    def _check_mandatory_message(self, text: str, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check if mandatory disclaimer or legal notice is missing."""
        findings = []
        mandatory = rule.get("value", "").strip()

        if not mandatory:
            return findings

        # Check case-insensitive presence of mandatory phrase or key tokens
        if mandatory.lower() not in text.lower():
            rule_name = rule.get("name", "Mandatory Disclaimer")
            findings.append({
                "category": "Missing Disclaimer",
                "severity": "high",
                "original_text": "(Entire content reviewed)",
                "explanation": f'Required message or disclaimer is missing: "{mandatory}"',
                "guideline_reference": f"Mandatory Message: '{rule_name}'",
                "evidence": f"Brand policy requires inclusion of: {mandatory}",
                "suggested_correction": f"Add the following to your content: {mandatory}",
                "confidence": 0.95,
                "engine": "rule_engine",
            })

        return findings

    def _check_approved_facts(self, text: str, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Check for potential factual claims that contradict approved company facts.
        Extracts metrics/numbers in the rule and checks if the text asserts contradictory metrics.
        """
        findings = []
        fact_name = rule.get("name", "")
        fact_value = rule.get("value", "")

        if not fact_value:
            return findings

        # Extract percentages or numbers from the approved fact
        # e.g., "99.9% uptime" or "Over 500 Enterprise clients"
        rule_numbers = re.findall(r"\b\d+(?:\.\d+)?%?", fact_value)
        rule_keywords = [w.lower() for w in re.findall(r"\b[A-Za-z]{4,}\b", fact_name + " " + fact_value)]

        # Check if text mentions fact subject with contradictory numbers
        for kw in rule_keywords:
            if kw in ["with", "from", "that", "this", "have", "been", "over", "more", "than"]:
                continue
            if kw in text.lower():
                # Search for surrounding sentences
                sentences = re.split(r"[.!?\n]", text)
                for sentence in sentences:
                    if kw in sentence.lower():
                        # Check if sentence has numbers that differ from rule numbers
                        sentence_nums = re.findall(r"\b\d+(?:\.\d+)?%?", sentence)
                        for s_num in sentence_nums:
                            if rule_numbers and s_num not in rule_numbers:
                                findings.append({
                                    "category": "Factual Mismatch",
                                    "severity": "medium",
                                    "original_text": sentence.strip(),
                                    "explanation": (
                                        f"Sentence mentions '{kw}' with '{s_num}', which may conflict with "
                                        f"approved fact '{fact_name}': '{fact_value}'."
                                    ),
                                    "guideline_reference": f"Approved Fact: '{fact_name}'",
                                    "evidence": f"Approved Fact record: {fact_value}",
                                    "suggested_correction": f"Align statement with approved fact: {fact_value}",
                                    "confidence": 0.85,
                                    "engine": "rule_engine",
                                })
                                break

        return findings

    def _check_brand_voice(self, text: str, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for tone violations defined in brand voice rules."""
        findings = []
        avoid_words = (rule.get("metadata") or {}).get("avoid_words", [])
        if isinstance(avoid_words, str):
            avoid_words = [w.strip() for w in avoid_words.split(",") if w.strip()]

        for word in avoid_words:
            pattern = self._compile_pattern(word)
            for match in pattern.finditer(text):
                context = self._extract_context(text, match.start(), match.end())
                findings.append({
                    "category": "Brand Voice Deviation",
                    "severity": "low",
                    "original_text": context,
                    "explanation": f"The tone/style term '{match.group()}' violates the brand voice guideline '{rule.get('name', 'Voice Style')}'.",
                    "guideline_reference": f"Brand Voice: {rule.get('name', 'Tone')}",
                    "evidence": rule.get("description", "Maintain specified brand voice style."),
                    "suggested_correction": "Rephrase using approved brand tone and positive, clear language.",
                    "confidence": 0.88,
                    "engine": "rule_engine",
                })

        return findings

    def _check_brand_colors(self, text: str, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verify hex colors mentioned in content match brand palette."""
        findings = []
        approved_hex = rule.get("value", "").upper()
        metadata = rule.get("metadata", {})
        allowed_palette = [approved_hex]
        if "palette" in metadata and isinstance(metadata["palette"], list):
            allowed_palette.extend([c.upper() for c in metadata["palette"]])

        # Find hex colors in text e.g. #FFFFFF
        hex_matches = re.finditer(r"#(?:[0-9a-fA-F]{3}){1,2}\b", text)
        for match in hex_matches:
            found_hex = match.group().upper()
            if found_hex not in allowed_palette:
                context = self._extract_context(text, match.start(), match.end())
                findings.append({
                    "category": "Visual Inconsistency",
                    "severity": "low",
                    "original_text": context,
                    "explanation": f"Color code {found_hex} is not in the approved brand color palette ({', '.join(allowed_palette)}).",
                    "guideline_reference": f"Brand Color Rule: {rule.get('name', 'Approved Palette')}",
                    "evidence": f"Approved color: {approved_hex}",
                    "suggested_correction": f"Use approved brand color {approved_hex}.",
                    "confidence": 0.92,
                    "engine": "rule_engine",
                })

        return findings
