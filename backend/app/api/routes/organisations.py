"""Organisation management, membership, and workspace-scoped resource endpoints."""

import uuid
from typing import List, Dict, Any, Optional
import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, status

from app.core.security import (
    get_current_user,
    verify_org_membership,
    verify_content_access,
    verify_document_access,
    verify_rule_access,
)
from app.database.client import (
    fetch_one,
    fetch_all,
    insert_row,
    update_row,
    delete_rows,
    execute_query,
)
from app.schemas.organisation import (
    OrganisationCreate,
    OrganisationResponse,
    OrganisationMember,
    InviteMember,
    UpdateMemberRole,
)
from app.schemas.audit import AuditReport
from app.services.document_processor import process_document_bytes, validate_file
from app.services.embedding_service import generate_embeddings_batch
from app.services.retrieval_service import store_chunks, delete_document_chunks
from app.services.audit_service import run_audit
from app.services.approval_service import (
    submit_for_review,
    approve_content,
    reject_content,
    request_changes,
    add_comment,
    get_review_history,
)
from app.services.correction_service import (
    accept_correction,
    reject_correction,
    edit_correction,
)
from app.services.analytics_service import (
    get_overview,
    get_violation_stats,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/organisations", tags=["Organisations"])


# =====================================================================
# ORGANISATION WORKSPACE MANAGEMENT
# =====================================================================

@router.post("", response_model=OrganisationResponse, status_code=status.HTTP_201_CREATED)
async def create_organisation(
    payload: OrganisationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new organisation workspace and assign creator as admin."""
    user_id = current_user["id"]
    org_id = str(uuid.uuid4())

    org_data = {
        "id": org_id,
        "name": payload.name,
        "description": payload.description or "",
        "logo_url": payload.logo_url,
        "is_demo": False,
        "created_by": user_id,
    }

    insert_row("organisations", org_data)

    # Add creator as admin member
    insert_row(
        "organisation_members",
        {
            "id": str(uuid.uuid4()),
            "organisation_id": org_id,
            "user_id": user_id,
            "role": "admin",
            "email": current_user.get("email", ""),
        },
    )

    return org_data


@router.get("", response_model=List[OrganisationResponse])
async def list_user_organisations(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all organisations the current user belongs to or created."""
    user_id = current_user["id"]

    # Query organisations where user is a member
    query = """
    SELECT DISTINCT o.* FROM organisations o
    LEFT JOIN organisation_members m ON o.id = m.organisation_id
    WHERE m.user_id = ? OR o.created_by = ?
    ORDER BY o.created_at DESC
    """
    orgs = execute_query(query, (user_id, user_id))
    return orgs


@router.get("/{id}", response_model=OrganisationResponse)
async def get_organisation_details(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get details for a specific organisation."""
    await verify_org_membership(id, current_user["id"])
    org = fetch_one("organisations", {"id": id})
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organisation with ID '{id}' not found",
        )
    return org


@router.patch("/{id}", response_model=OrganisationResponse)
async def update_organisation(
    id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update organisation details."""
    await verify_org_membership(id, current_user["id"], allowed_roles=["admin"])
    clean_data = {k: v for k, v in payload.items() if k in ("name", "description", "logo_url")}
    updated = update_row("organisations", {"id": id}, clean_data)
    if not updated:
        org = fetch_one("organisations", {"id": id})
        if not org:
            raise HTTPException(status_code=404, detail="Organisation not found")
        return org
    return updated


# =====================================================================
# MEMBERSHIP AND ROLES
# =====================================================================

@router.get("/{id}/members", response_model=List[OrganisationMember])
async def list_members(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all members and their roles in an organisation."""
    await verify_org_membership(id, current_user["id"])
    query = """
    SELECT m.id, m.organisation_id, m.user_id, m.role, m.joined_at,
           COALESCE(p.email, m.email) as email,
           COALESCE(p.full_name, m.email, 'Team Member') as full_name
    FROM organisation_members m
    LEFT JOIN profiles p ON m.user_id = p.id
    WHERE m.organisation_id = ?
    """
    members = execute_query(query, (id,))
    return members


@router.post("/{id}/members", response_model=OrganisationMember)
@router.post("/{id}/invite", response_model=OrganisationMember)
async def invite_member(
    id: str,
    payload: InviteMember,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Invite or add a member to the organisation by email."""
    await verify_org_membership(id, current_user["id"], allowed_roles=["admin"])
    # Check if target profile exists
    target_profile = fetch_one("profiles", {"email": payload.email})
    if target_profile:
        target_user_id = target_profile["id"]
        full_name = target_profile.get("full_name")
    else:
        target_user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, payload.email))
        full_name = payload.email.split("@")[0].capitalize()
        insert_row("profiles", {
            "id": target_user_id,
            "email": payload.email,
            "full_name": full_name,
        })

    # Check if already a member
    existing = fetch_one(
        "organisation_members",
        {"organisation_id": id, "user_id": target_user_id},
    )
    if existing:
        return {
            **existing,
            "email": payload.email,
            "full_name": full_name,
        }

    member_data = {
        "id": str(uuid.uuid4()),
        "organisation_id": id,
        "user_id": target_user_id,
        "role": payload.role.value,
        "email": payload.email,
    }
    inserted = insert_row("organisation_members", member_data)
    return {
        **(inserted or member_data),
        "email": payload.email,
        "full_name": full_name,
    }


@router.patch("/{id}/members/{user_id}", response_model=OrganisationMember)
@router.put("/{id}/members/{user_id}/role", response_model=OrganisationMember)
async def update_member_role(
    id: str,
    user_id: str,
    payload: UpdateMemberRole,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update role for an organisation member."""
    await verify_org_membership(id, current_user["id"], allowed_roles=["admin"])
    updated = update_row(
        "organisation_members",
        {"organisation_id": id, "user_id": user_id},
        {"role": payload.role.value},
    )
    if not updated:
        # Check if member exists
        m = fetch_one("organisation_members", {"organisation_id": id, "user_id": user_id})
        if not m:
            raise HTTPException(status_code=404, detail="Member record not found")
        return m
    return updated


@router.delete("/{id}/members/{user_id}")
async def remove_member(
    id: str,
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Remove a member from the organisation."""
    await verify_org_membership(id, current_user["id"], allowed_roles=["admin"])
    delete_rows("organisation_members", {"organisation_id": id, "user_id": user_id})
    return {"message": "Member removed successfully"}


# =====================================================================
# REST ALIASES: BRAND DOCUMENTS
# =====================================================================

@router.get("/{id}/documents")
async def list_org_documents(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List brand guideline documents for this organisation."""
    await verify_org_membership(id, current_user["id"])
    return fetch_all("brand_documents", {"organisation_id": id}, order_by="created_at", desc=True)


@router.post("/{id}/documents")
async def upload_org_document(
    id: str,
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Upload and index a brand guideline document for this organisation."""
    await verify_org_membership(id, current_user["id"])
    contents = await file.read()
    filename = file.filename or "guideline.txt"

    is_valid, err_msg = validate_file(filename, contents)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    doc_id = str(uuid.uuid4())
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    doc_record = {
        "id": doc_id,
        "organisation_id": id,
        "name": filename,
        "file_type": ext,
        "file_size": len(contents),
        "status": "processing",
        "chunk_count": 0,
        "uploaded_by": current_user["id"],
    }
    insert_row("brand_documents", doc_record)

    try:
        processed = process_document_bytes(filename, contents)
        chunks = processed.get("chunks", [])

        chunk_texts = [c["content"] for c in chunks]
        embeddings = await generate_embeddings_batch(chunk_texts)

        for c, emb in zip(chunks, embeddings):
            c["embedding"] = emb

        stored_count = await store_chunks(id, doc_id, chunks)

        update_row(
            "brand_documents",
            {"id": doc_id},
            {"status": "ready", "chunk_count": stored_count},
        )
        return {
            "id": doc_id,
            "organisation_id": id,
            "name": filename,
            "file_type": ext,
            "status": "ready",
            "chunk_count": stored_count,
            "file_size": len(contents),
        }
    except Exception as e:
        logger.error("Failed to process brand document", error=str(e), doc_id=doc_id)
        update_row("brand_documents", {"id": doc_id}, {"status": "error"})
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")


@router.delete("/{id}/documents/{doc_id}")
async def delete_org_document(
    id: str,
    doc_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete a brand document and its vector chunks."""
    await verify_org_membership(id, current_user["id"])
    await delete_document_chunks(doc_id)
    delete_rows("brand_documents", {"id": doc_id, "organisation_id": id})
    return {"message": "Document deleted successfully"}


# =====================================================================
# REST ALIASES: BRAND RULES
# =====================================================================

@router.get("/{id}/rules")
async def list_org_rules(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List brand governance rules for this organisation."""
    await verify_org_membership(id, current_user["id"])
    return fetch_all("brand_rules", {"organisation_id": id}, order_by="created_at", desc=True)


@router.post("/{id}/rules")
async def create_org_rule(
    id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a brand governance rule."""
    await verify_org_membership(id, current_user["id"])
    rule_id = str(uuid.uuid4())
    rule_data = {
        "id": rule_id,
        "organisation_id": id,
        "rule_type": payload.get("rule_type", "preferred_terminology"),
        "name": payload.get("name", "Brand Rule"),
        "value": payload.get("value", ""),
        "replacement": payload.get("replacement"),
        "description": payload.get("description", ""),
        "metadata": payload.get("metadata", {}),
        "is_active": payload.get("is_active", True),
        "created_by": current_user["id"],
    }
    insert_row("brand_rules", rule_data)
    return rule_data


@router.patch("/{id}/rules/{rule_id}")
@router.put("/{id}/rules/{rule_id}")
async def update_org_rule(
    id: str,
    rule_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update a brand rule."""
    await verify_org_membership(id, current_user["id"])
    clean_data = {k: v for k, v in payload.items() if k not in ("id", "organisation_id", "created_at")}
    updated = update_row("brand_rules", {"id": rule_id, "organisation_id": id}, clean_data)
    if not updated:
        r = fetch_one("brand_rules", {"id": rule_id})
        if not r:
            raise HTTPException(status_code=404, detail="Rule not found")
        return r
    return updated


@router.delete("/{id}/rules/{rule_id}")
async def delete_org_rule(
    id: str,
    rule_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete a brand rule."""
    await verify_org_membership(id, current_user["id"])
    delete_rows("brand_rules", {"id": rule_id, "organisation_id": id})
    return {"message": "Brand rule deleted successfully"}


# =====================================================================
# REST ALIASES: BRAND ASSETS
# =====================================================================

@router.get("/{id}/assets")
async def list_org_assets(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List brand assets for this organisation."""
    await verify_org_membership(id, current_user["id"])
    return fetch_all("brand_assets", {"organisation_id": id})


@router.post("/{id}/assets")
async def create_org_asset(
    id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create or register a brand asset."""
    await verify_org_membership(id, current_user["id"])
    asset_id = str(uuid.uuid4())
    asset_data = {
        "id": asset_id,
        "organisation_id": id,
        "name": payload.get("name", "Brand Asset"),
        "asset_type": payload.get("asset_type", "logo"),
        "file_url": payload.get("file_url", ""),
        "metadata": payload.get("metadata", {}),
        "uploaded_by": current_user["id"],
    }
    insert_row("brand_assets", asset_data)
    return asset_data


@router.delete("/{id}/assets/{asset_id}")
async def delete_org_asset(
    id: str,
    asset_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete a brand asset."""
    await verify_org_membership(id, current_user["id"])
    delete_rows("brand_assets", {"id": asset_id, "organisation_id": id})
    return {"message": "Brand asset deleted successfully"}


# =====================================================================
# REST ALIASES: CONTENT SUBMISSIONS & AUDITS
# =====================================================================

@router.get("/{id}/content")
async def list_org_content(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List content submissions for this organisation."""
    await verify_org_membership(id, current_user["id"])
    return fetch_all("content_submissions", {"organisation_id": id}, order_by="created_at", desc=True)


@router.post("/{id}/content")
async def create_org_content(
    id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Submit content for this organisation and immediately run compliance audit."""
    await verify_org_membership(id, current_user["id"])
    content_id = str(uuid.uuid4())
    user_id = current_user["id"]
    text = payload.get("content") or payload.get("text_content") or ""

    submission_data = {
        "id": content_id,
        "organisation_id": id,
        "title": payload.get("title", "Untitled Content"),
        "category": payload.get("category", "marketing_campaign"),
        "original_content": text,
        "current_content": text,
        "content_type": payload.get("content_type", "text"),
        "status": "draft",
        "submitted_by": user_id,
        "assigned_reviewer": payload.get("assigned_reviewer"),
    }
    insert_row("content_submissions", submission_data)

    # Immediately execute automated compliance audit
    report = await run_audit(content_id=content_id, org_id=id)

    return {
        "submission": submission_data,
        "reportId": report.id,
        "report": report,
    }


@router.get("/{id}/content/{content_id}")
async def get_org_content_item(
    id: str,
    content_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get single content submission."""
    await verify_org_membership(id, current_user["id"])
    sub = fetch_one("content_submissions", {"id": content_id, "organisation_id": id})
    if not sub:
        raise HTTPException(status_code=404, detail="Content submission not found")
    return sub


@router.patch("/{id}/content/{content_id}")
async def update_org_content_text(
    id: str,
    content_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update content draft text."""
    await verify_org_membership(id, current_user["id"])
    new_text = payload.get("content") or payload.get("current_content")
    if new_text is not None:
        update_row("content_submissions", {"id": content_id, "organisation_id": id}, {"current_content": new_text})
    sub = fetch_one("content_submissions", {"id": content_id, "organisation_id": id})
    return sub


@router.post("/{id}/content/{content_id}/audit")
async def run_org_content_audit(
    id: str,
    content_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Trigger brand compliance audit for a content submission."""
    await verify_org_membership(id, current_user["id"])
    report = await run_audit(content_id=content_id, org_id=id)
    return report


@router.get("/{id}/content/{content_id}/report")
async def get_org_content_report(
    id: str,
    content_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve the latest audit report for a content submission."""
    await verify_org_membership(id, current_user["id"])
    audits = fetch_all(
        "audit_reports",
        {"content_id": content_id, "organisation_id": id},
        order_by="created_at",
        desc=True,
        limit=1,
    )
    if not audits:
        raise HTTPException(status_code=404, detail="No audit reports found for this content")

    report_dict = audits[0]
    raw_findings = fetch_all("compliance_findings", {"audit_id": report_dict["id"]})
    return {
        **report_dict,
        "findings": raw_findings,
    }


@router.get("/{id}/audits")
async def list_org_audits(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all audit reports for this organisation."""
    await verify_org_membership(id, current_user["id"])
    audits = fetch_all("audit_reports", {"organisation_id": id}, order_by="created_at", desc=True)
    results = []
    for a in audits:
        findings = fetch_all("compliance_findings", {"audit_id": a["id"]})
        results.append({**a, "findings": findings})
    return results


# =====================================================================
# REST ALIASES: REVIEWS & WORKFLOW
# =====================================================================

@router.post("/{id}/content/{content_id}/submit-review")
async def org_submit_review(
    id: str,
    content_id: str,
    payload: Dict[str, Any] = Body(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Submit content for formal review."""
    await verify_org_membership(id, current_user["id"])
    notes = payload.get("notes") if payload else None
    assigned = payload.get("assigned_reviewer") if payload else None
    await submit_for_review(content_id=content_id, user_id=current_user["id"], assigned_reviewer=assigned, note=notes)
    return fetch_one("content_submissions", {"id": content_id})


@router.post("/{id}/content/{content_id}/approve")
async def org_approve_submission(
    id: str,
    content_id: str,
    payload: Dict[str, Any] = Body(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Approve content submission."""
    await verify_org_membership(id, current_user["id"], allowed_roles=["reviewer", "admin"])
    comment = payload.get("comment") if payload else None
    await approve_content(content_id=content_id, reviewer_id=current_user["id"], comment=comment)
    return fetch_one("content_submissions", {"id": content_id})


@router.post("/{id}/content/{content_id}/reject")
async def org_reject_submission(
    id: str,
    content_id: str,
    payload: Dict[str, Any] = Body(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Reject content submission."""
    await verify_org_membership(id, current_user["id"], allowed_roles=["reviewer", "admin"])
    comment = payload.get("comment") if payload else None
    await reject_content(content_id=content_id, reviewer_id=current_user["id"], comment=comment)
    return fetch_one("content_submissions", {"id": content_id})


@router.post("/{id}/content/{content_id}/request-changes")
async def org_request_changes(
    id: str,
    content_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Request revisions on content submission."""
    await verify_org_membership(id, current_user["id"], allowed_roles=["reviewer", "admin"])
    comment = payload.get("comment", "Revisions requested.")
    await request_changes(content_id=content_id, reviewer_id=current_user["id"], comment=comment)
    return fetch_one("content_submissions", {"id": content_id})


@router.get("/{id}/content/{content_id}/comments")
async def org_get_comments(
    id: str,
    content_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get comments on content submission."""
    await verify_org_membership(id, current_user["id"])
    query = """
    SELECT c.*, COALESCE(p.full_name, p.email, 'Reviewer') as user_name
    FROM review_comments c
    LEFT JOIN profiles p ON c.user_id = p.id
    WHERE c.content_id = ?
    ORDER BY c.created_at ASC
    """
    return execute_query(query, (content_id,))


@router.post("/{id}/content/{content_id}/comments")
async def org_add_comment(
    id: str,
    content_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Add a review comment."""
    await verify_org_membership(id, current_user["id"])
    comment_text = payload.get("comment", "")
    return await add_comment(content_id=content_id, user_id=current_user["id"], comment_text=comment_text)


@router.get("/{id}/content/{content_id}/approvals")
async def org_get_approvals(
    id: str,
    content_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get approval history trail."""
    await verify_org_membership(id, current_user["id"])
    query = """
    SELECT a.*, COALESCE(p.full_name, p.email, 'Reviewer') as reviewer_name
    FROM approval_records a
    LEFT JOIN profiles p ON a.reviewer_id = p.id
    WHERE a.content_id = ?
    ORDER BY a.created_at ASC
    """
    return execute_query(query, (content_id,))


@router.get("/{id}/content/{content_id}/revisions")
async def org_get_revisions(
    id: str,
    content_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get revision history for a content submission."""
    await verify_org_membership(id, current_user["id"])
    query = """
    SELECT r.*, COALESCE(p.full_name, p.email, 'Creator') as performer_name
    FROM revision_history r
    LEFT JOIN profiles p ON r.performed_by = p.id
    WHERE r.content_id = ?
    ORDER BY r.created_at ASC
    """
    return execute_query(query, (content_id,))


@router.patch("/{id}/content/{content_id}/findings/{finding_id}")
async def org_update_finding(
    id: str,
    content_id: str,
    finding_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Accept, reject, edit, or ignore a compliance finding."""
    await verify_org_membership(id, current_user["id"])
    status_val = payload.get("status")
    custom_text = payload.get("custom_correction") or payload.get("custom_text")
    user_id = current_user["id"]

    if status_val == "accepted":
        await accept_correction(finding_id=finding_id, user_id=user_id)
    elif status_val == "rejected":
        await reject_correction(finding_id=finding_id, user_id=user_id)
    elif status_val == "manually_edited" and custom_text:
        await edit_correction(finding_id=finding_id, custom_text=custom_text, user_id=user_id)
    else:
        update_row("compliance_findings", {"id": finding_id}, {"status": status_val})

    # Return updated report and submission
    audits = fetch_all("audit_reports", {"content_id": content_id}, order_by="created_at", desc=True, limit=1)
    report_dict = audits[0] if audits else {}
    findings = fetch_all("compliance_findings", {"audit_id": report_dict.get("id")}) if report_dict else []
    report_dict["findings"] = findings
    submission = fetch_one("content_submissions", {"id": content_id})

    return {
        "report": report_dict,
        "submission": submission,
    }


# =====================================================================
# REST ALIASES: ANALYTICS
# =====================================================================

@router.get("/{id}/analytics/overview")
async def org_analytics_overview(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve compliance overview metrics computed from actual DB records."""
    await verify_org_membership(id, current_user["id"])
    return await get_overview(org_id=id)


@router.get("/{id}/analytics/violations")
async def org_analytics_violations(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve violation statistics computed from actual DB records."""
    await verify_org_membership(id, current_user["id"])
    return await get_violation_stats(org_id=id)


# =====================================================================
# REST ALIASES: CAMPAIGNS
# =====================================================================

@router.get("/{id}/campaigns")
async def org_list_campaigns(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all marketing campaigns for this organisation."""
    await verify_org_membership(id, current_user["id"])
    from app.services.campaign_service import list_campaigns
    return await list_campaigns(org_id=id)


@router.post("/{id}/campaigns")
async def org_create_campaign(
    id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new campaign for this organisation."""
    await verify_org_membership(id, current_user["id"])
    from app.services.campaign_service import create_campaign
    from app.schemas.campaign import CampaignCreate
    campaign_payload = CampaignCreate(**payload)
    return await create_campaign(org_id=id, payload=campaign_payload, user_id=current_user["id"])


@router.get("/{id}/campaigns")
async def org_list_campaigns(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all campaigns for an organisation."""
    await verify_org_membership(id, current_user["id"])
    from app.services.campaign_service import list_campaigns
    return await list_campaigns(org_id=id)


@router.get("/{id}/campaigns/{campaign_id}")
async def org_get_campaign(
    id: str,
    campaign_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get single campaign details for an organisation."""
    await verify_org_membership(id, current_user["id"])
    from app.services.campaign_service import get_campaign_details
    return await get_campaign_details(campaign_id=campaign_id, org_id=id)


@router.post("/{id}/campaigns/{campaign_id}/assets")
async def org_add_campaign_asset(
    id: str,
    campaign_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Add a channel asset to a campaign for an organisation."""
    await verify_org_membership(id, current_user["id"])
    from app.services.campaign_service import add_asset_to_campaign
    from app.schemas.campaign import CampaignAssetCreate
    asset_payload = CampaignAssetCreate(**payload)
    return await add_asset_to_campaign(campaign_id=campaign_id, org_id=id, payload=asset_payload, user_id=current_user["id"])


@router.post("/{id}/campaigns/{campaign_id}/audit")
async def org_run_campaign_audit(
    id: str,
    campaign_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Execute a multi-channel consistency and compliance audit for a campaign."""
    await verify_org_membership(id, current_user["id"])
    from app.services.campaign_service import run_campaign_audit
    return await run_campaign_audit(campaign_id=campaign_id, org_id=id)
