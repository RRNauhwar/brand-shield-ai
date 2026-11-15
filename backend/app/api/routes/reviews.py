"""Review workflow and approval endpoints."""

from typing import Dict, Any, Optional
import structlog
from fastapi import APIRouter, Depends, HTTPException, Body, status

from app.core.security import get_current_user, verify_content_access
from app.schemas.review import (
    ReviewSubmit,
    ReviewComment,
    ReviewAction,
    ReviewHistoryResponse,
    CommentResponse,
)
from app.services.approval_service import (
    submit_for_review,
    approve_content,
    reject_content,
    request_changes,
    add_comment,
    get_review_history,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/reviews", tags=["Review Workflow & Approvals"])


@router.post("/{content_id}/submit")
async def submit_content_review(
    content_id: str,
    payload: Optional[ReviewSubmit] = Body(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Submit content for formal editorial/brand review."""
    await verify_content_access(content_id, current_user["id"])
    assigned_reviewer = payload.assigned_reviewer if payload else None
    note = payload.note if payload else None
    return await submit_for_review(
        content_id=content_id,
        user_id=current_user["id"],
        assigned_reviewer=assigned_reviewer,
        note=note,
    )


@router.post("/{content_id}/comment")
async def add_review_comment(
    content_id: str,
    payload: ReviewComment,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Add a review discussion comment to a content submission."""
    await verify_content_access(content_id, current_user["id"])
    return await add_comment(
        content_id=content_id,
        user_id=current_user["id"],
        comment_text=payload.comment,
    )


@router.post("/{content_id}/approve")
async def approve_submission(
    content_id: str,
    payload: Optional[ReviewComment] = Body(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Approve content submission for publication."""
    await verify_content_access(content_id, current_user["id"], allowed_roles=["reviewer", "admin"])
    comment = payload.comment if payload else None
    return await approve_content(
        content_id=content_id,
        reviewer_id=current_user["id"],
        comment=comment,
    )


@router.post("/{content_id}/reject")
async def reject_submission(
    content_id: str,
    payload: Optional[ReviewComment] = Body(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Reject content submission."""
    await verify_content_access(content_id, current_user["id"], allowed_roles=["reviewer", "admin"])
    comment = payload.comment if payload else None
    return await reject_content(
        content_id=content_id,
        reviewer_id=current_user["id"],
        comment=comment,
    )


@router.post("/{content_id}/request-changes")
async def request_submission_changes(
    content_id: str,
    payload: Optional[ReviewComment] = Body(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Request changes on a submitted content draft."""
    await verify_content_access(content_id, current_user["id"], allowed_roles=["reviewer", "admin"])
    comment = payload.comment if payload else None
    return await request_changes(
        content_id=content_id,
        reviewer_id=current_user["id"],
        comment=comment,
    )


@router.get("/{content_id}/history", response_model=ReviewHistoryResponse)
async def get_content_review_history(
    content_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get complete review history, comments, and approval audit trail."""
    await verify_content_access(content_id, current_user["id"])
    history_dict = await get_review_history(content_id=content_id)
    return history_dict
