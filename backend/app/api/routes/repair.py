"""AI Repair Studio API endpoints for intelligent content remediation and diff analysis."""

from typing import Dict, Any, Optional
import structlog
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user, verify_content_access, verify_finding_access
from app.schemas.campaign import SmartRepairRequest, SmartRepairResponse
from app.services.llm_analyzer import LLMAnalyzer
from app.database.client import fetch_one

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/repair", tags=["AI Repair Studio"])


@router.post("/suggest", response_model=SmartRepairResponse)
@router.post("/smart", response_model=SmartRepairResponse)
async def generate_remediation_suggestion(
    payload: SmartRepairRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Generate surgical, context-aware content repair using Google Gemini.
    Preserves authorial intent and tone while resolving the flagged brand violation.
    """
    analyzer = LLMAnalyzer()

    full_text = payload.original_text
    flagged_snippet = ""
    explanation = payload.explanation or "Content deviates from brand governance policies."
    guideline_ref = payload.guideline_reference

    if payload.finding_id:
        finding = fetch_one("compliance_findings", {"id": payload.finding_id})
        if finding:
            await verify_finding_access(payload.finding_id, current_user["id"])
            flagged_snippet = finding.get("original_text", "")
            explanation = finding.get("explanation", explanation)
            guideline_ref = finding.get("guideline_reference", guideline_ref)

    if not flagged_snippet:
        flagged_snippet = payload.original_text

    result = await analyzer.generate_smart_repair(
        full_text=full_text,
        problematic_text=flagged_snippet,
        explanation=explanation,
        guideline_reference=guideline_ref,
        custom_instruction=payload.instruction,
    )

    return SmartRepairResponse(
        repaired_text=result.get("repaired_text", full_text),
        diff_summary=result.get("diff_summary", "Updated copy to satisfy brand standards."),
        safety_rationale=result.get("safety_rationale", "Aligned copy with brand voice and factual policies."),
        engine=result.get("engine", "gemini"),
        model=result.get("model", "gemini-2.5-flash"),
        changes=result.get("changes", []),
    )
