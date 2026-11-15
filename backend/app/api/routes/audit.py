"""Audit execution and compliance reporting endpoints."""

from typing import Dict, Any, List
import structlog
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user, verify_content_access
from app.database.client import (
    get_supabase_admin_client,
    fetch_one,
    fetch_all,
)
from app.schemas.audit import (
    AuditReport,
    ComplianceFinding,
    Severity,
    FindingStatus,
)
from app.services.audit_service import run_audit

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/audit", tags=["Audits & Compliance Engine"])


@router.post("/{content_id}", response_model=AuditReport, status_code=status.HTTP_200_OK)
async def trigger_content_audit(
    content_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Execute full automated brand compliance audit for a content submission.
    Combines deterministic rules, semantic guideline retrieval, and LLM analysis.
    """
    content = await verify_content_access(content_id, current_user["id"])
    supabase = get_supabase_admin_client()

    org_id = content.get("organisation_id")
    report = await run_audit(content_id=content_id, org_id=org_id, client=supabase)
    return report


@router.get("/{audit_id}", response_model=AuditReport)
async def get_audit_report(
    audit_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve an audit report along with all associated compliance findings."""
    supabase = get_supabase_admin_client()
    report_dict = fetch_one("audit_reports", {"id": audit_id}, client=supabase)
    if not report_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit report with ID '{audit_id}' not found",
        )

    # Ensure user has access to this content
    await verify_content_access(report_dict["content_id"], current_user["id"])

    # Fetch findings
    raw_findings = fetch_all("compliance_findings", {"audit_id": audit_id}, client=supabase)
    findings = []
    for f in raw_findings:
        sev_str = str(f.get("severity", "low")).lower()
        try:
            sev_enum = Severity(sev_str)
        except ValueError:
            sev_enum = Severity.LOW

        status_str = str(f.get("status", "open")).lower()
        try:
            status_enum = FindingStatus(status_str)
        except ValueError:
            status_enum = FindingStatus.OPEN

        findings.append(
            ComplianceFinding(
                id=f.get("id"),
                audit_id=f.get("audit_id"),
                content_id=f.get("content_id"),
                category=f.get("category", "General Violation"),
                severity=sev_enum,
                original_text=f.get("original_text", ""),
                explanation=f.get("explanation", ""),
                guideline_reference=f.get("guideline_reference"),
                evidence=f.get("evidence"),
                source_document=f.get("source_document"),
                source_page=f.get("source_page"),
                suggested_correction=f.get("suggested_correction"),
                confidence=float(f.get("confidence", 0.8)),
                status=status_enum,
                engine=f.get("engine", "rule_engine"),
                created_at=f.get("created_at"),
                updated_at=f.get("updated_at"),
            )
        )

    return AuditReport(
        id=report_dict.get("id"),
        content_id=report_dict.get("content_id"),
        organisation_id=report_dict.get("organisation_id"),
        overall_score=report_dict.get("overall_score", 0.0),
        total_findings=report_dict.get("total_findings", len(findings)),
        critical_count=report_dict.get("critical_count", 0),
        high_count=report_dict.get("high_count", 0),
        medium_count=report_dict.get("medium_count", 0),
        low_count=report_dict.get("low_count", 0),
        info_count=report_dict.get("info_count", 0),
        findings=findings,
        summary=report_dict.get("summary", ""),
        engine=report_dict.get("engine", "gemini"),
        is_ai_powered=bool(report_dict.get("is_ai_powered", True)),
        ai_model=report_dict.get("ai_model", "gemini-2.5-flash"),
        created_at=report_dict.get("created_at"),
        processing_time_seconds=report_dict.get("processing_time_seconds"),
    )


@router.get("/content/{content_id}", response_model=AuditReport)
async def get_latest_audit_for_content(
    content_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve the most recent audit report generated for a specific content submission."""
    await verify_content_access(content_id, current_user["id"])
    audits = fetch_all(
        "audit_reports",
        {"content_id": content_id},
        order_by="created_at",
        desc=True,
        limit=1,
    )
    if not audits:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No audit reports found for content '{content_id}'",
        )

    latest_audit = audits[0]
    return await get_audit_report(latest_audit["id"], current_user=current_user)
