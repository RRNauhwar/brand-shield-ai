"""Content submission, file upload ingestion, and revision endpoints."""

import uuid
from typing import List, Optional, Dict, Any
import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status

from app.core.security import get_current_user, verify_org_membership, verify_content_access
from app.database.client import (
    fetch_one,
    fetch_all,
    insert_row,
    execute_query,
)
from app.schemas.content import (
    ContentSubmission,
    ContentResponse,
    ContentCategory,
    ContentType,
    ContentStatus,
    RevisionHistoryItem,
)
from app.services.document_processor import process_document_bytes, validate_file
from app.services.visual_analyzer import extract_text_from_image

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/content", tags=["Content Submissions"])


@router.post("", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
async def submit_content_text(
    payload: ContentSubmission,
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Submit text content for brand compliance auditing."""
    await verify_org_membership(org_id, current_user["id"])
    content_id = str(uuid.uuid4())
    user_id = current_user["id"]

    submission_data = {
        "id": content_id,
        "organisation_id": org_id,
        "title": payload.title,
        "category": payload.category.value,
        "original_content": payload.text_content,
        "current_content": payload.text_content,
        "content_type": payload.content_type.value,
        "status": ContentStatus.DRAFT.value,
        "submitted_by": user_id,
        "assigned_reviewer": payload.assigned_reviewer,
    }
    insert_row("content_submissions", submission_data)
    return submission_data


@router.post("/upload", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
async def submit_content_file(
    file: UploadFile = File(...),
    org_id: str = Form(...),
    title: str = Form(...),
    category: ContentCategory = Form(...),
    assigned_reviewer: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Upload a file (PDF, DOCX, TXT, or Image) as a content submission, extracting its text."""
    await verify_org_membership(org_id, current_user["id"])
    contents = await file.read()
    filename = file.filename or "content.txt"

    is_valid, err_msg = validate_file(filename, contents)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"
    extracted_text = ""

    if ext in ["pdf", "docx", "txt"]:
        processed = process_document_bytes(filename, contents)
        extracted_text = processed.get("text", "")
        c_type = ContentType(ext) if ext in ["pdf", "docx"] else ContentType.TEXT
    elif ext in ["png", "jpg", "jpeg", "webp"]:
        extracted_text = extract_text_from_image(contents)
        c_type = ContentType.IMAGE
    else:
        c_type = ContentType.TEXT

    if not extracted_text:
        extracted_text = f"Content uploaded from file {filename}"

    content_id = str(uuid.uuid4())
    user_id = current_user["id"]

    submission_data = {
        "id": content_id,
        "organisation_id": org_id,
        "title": title,
        "category": category.value,
        "original_content": extracted_text,
        "current_content": extracted_text,
        "content_type": c_type.value,
        "file_url": f"/storage/content/{content_id}/{filename}",
        "status": ContentStatus.DRAFT.value,
        "submitted_by": user_id,
        "assigned_reviewer": assigned_reviewer,
    }
    insert_row("content_submissions", submission_data)
    return submission_data


@router.get("", response_model=List[ContentResponse])
async def list_content_submissions(
    org_id: str = Query(...),
    status_filter: Optional[ContentStatus] = Query(None, alias="status"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all content submissions for an organisation."""
    await verify_org_membership(org_id, current_user["id"])
    match: Dict[str, Any] = {"organisation_id": org_id}
    if status_filter:
        match["status"] = status_filter.value

    return fetch_all("content_submissions", match, order_by="created_at", desc=True)


@router.get("/{id}", response_model=ContentResponse)
async def get_content_submission(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get content submission by ID."""
    content = await verify_content_access(id, current_user["id"])
    return content


@router.get("/{id}/revisions", response_model=List[RevisionHistoryItem])
async def get_revision_history(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve full revision history for a content submission."""
    await verify_content_access(id, current_user["id"])
    query = """
    SELECT r.*, COALESCE(p.full_name, p.email, 'Creator') as performer_name
    FROM revision_history r
    LEFT JOIN profiles p ON r.performed_by = p.id
    WHERE r.content_id = ?
    ORDER BY r.created_at ASC
    """
    revisions = execute_query(query, (id,))
    return [
        RevisionHistoryItem(
            id=r["id"],
            content_id=r["content_id"],
            finding_id=r.get("finding_id"),
            previous_text=r["previous_text"],
            new_text=r["new_text"],
            action=r["action"],
            performed_by=r.get("performed_by"),
            performer_name=r.get("performer_name", "User"),
            created_at=r.get("created_at"),
        )
        for r in revisions
    ]
