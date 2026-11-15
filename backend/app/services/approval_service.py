"""Review and multi-tier approval workflow service."""

import uuid
from typing import Dict, Any, List, Optional
import structlog
from fastapi import HTTPException, status

from app.database.client import (
    fetch_one,
    insert_row,
    update_row,
    execute_query,
)

logger = structlog.get_logger(__name__)


async def submit_for_review(
    content_id: str,
    user_id: str,
    assigned_reviewer: Optional[str] = None,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    """Submit content for formal reviewer approval."""
    content = fetch_one("content_submissions", {"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )

    prev_status = content.get("status", "draft")
    update_payload: Dict[str, Any] = {"status": "under_review"}
    if assigned_reviewer:
        update_payload["assigned_reviewer"] = assigned_reviewer

    update_row("content_submissions", {"id": content_id}, update_payload)
    insert_row(
        "approval_records",
        {
            "id": str(uuid.uuid4()),
            "content_id": content_id,
            "reviewer_id": user_id,
            "action": "submitted",
            "previous_status": prev_status,
            "new_status": "under_review",
            "comment": note,
        },
    )
    if note:
        insert_row(
            "review_comments",
            {
                "id": str(uuid.uuid4()),
                "content_id": content_id,
                "user_id": user_id,
                "comment": f"Submission Note: {note}",
            },
        )

    return {
        "content_id": content_id,
        "status": "under_review",
        "assigned_reviewer": assigned_reviewer,
        "message": "Content submitted for review successfully",
    }


async def approve_content(
    content_id: str,
    reviewer_id: str,
    comment: Optional[str] = None,
) -> Dict[str, Any]:
    """Approve content for publishing/distribution."""
    content = fetch_one("content_submissions", {"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )

    prev_status = content.get("status", "under_review")

    update_row("content_submissions", {"id": content_id}, {"status": "approved"})
    insert_row(
        "approval_records",
        {
            "id": str(uuid.uuid4()),
            "content_id": content_id,
            "reviewer_id": reviewer_id,
            "action": "approved",
            "previous_status": prev_status,
            "new_status": "approved",
            "comment": comment,
        },
    )
    if comment:
        insert_row(
            "review_comments",
            {
                "id": str(uuid.uuid4()),
                "content_id": content_id,
                "user_id": reviewer_id,
                "comment": comment,
            },
        )
    insert_row(
        "audit_events",
        {
            "id": str(uuid.uuid4()),
            "organisation_id": content.get("organisation_id"),
            "event_type": "content_approved",
            "event_data": {"content_id": content_id, "reviewer_id": reviewer_id},
            "user_id": reviewer_id,
        },
    )

    return {
        "content_id": content_id,
        "status": "approved",
        "action": "approved",
        "reviewer_id": reviewer_id,
    }


async def reject_content(
    content_id: str,
    reviewer_id: str,
    comment: Optional[str] = None,
) -> Dict[str, Any]:
    """Reject content submission."""
    content = fetch_one("content_submissions", {"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )

    prev_status = content.get("status", "under_review")

    update_row("content_submissions", {"id": content_id}, {"status": "rejected"})
    insert_row(
        "approval_records",
        {
            "id": str(uuid.uuid4()),
            "content_id": content_id,
            "reviewer_id": reviewer_id,
            "action": "rejected",
            "previous_status": prev_status,
            "new_status": "rejected",
            "comment": comment,
        },
    )
    if comment:
        insert_row(
            "review_comments",
            {
                "id": str(uuid.uuid4()),
                "content_id": content_id,
                "user_id": reviewer_id,
                "comment": comment,
            },
        )

    return {
        "content_id": content_id,
        "status": "rejected",
        "action": "rejected",
        "reviewer_id": reviewer_id,
    }


async def request_changes(
    content_id: str,
    reviewer_id: str,
    comment: Optional[str] = None,
) -> Dict[str, Any]:
    """Request changes on a submitted content draft."""
    content = fetch_one("content_submissions", {"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )

    prev_status = content.get("status", "under_review")

    update_row("content_submissions", {"id": content_id}, {"status": "changes_requested"})
    insert_row(
        "approval_records",
        {
            "id": str(uuid.uuid4()),
            "content_id": content_id,
            "reviewer_id": reviewer_id,
            "action": "changes_requested",
            "previous_status": prev_status,
            "new_status": "changes_requested",
            "comment": comment,
        },
    )
    if comment:
        insert_row(
            "review_comments",
            {
                "id": str(uuid.uuid4()),
                "content_id": content_id,
                "user_id": reviewer_id,
                "comment": comment,
            },
        )

    return {
        "content_id": content_id,
        "status": "changes_requested",
        "action": "changes_requested",
        "reviewer_id": reviewer_id,
    }


async def add_comment(
    content_id: str,
    user_id: str,
    comment_text: str,
) -> Dict[str, Any]:
    """Add a review discussion comment to a content item."""
    content = fetch_one("content_submissions", {"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )

    comment_id = str(uuid.uuid4())
    record = {
        "id": comment_id,
        "content_id": content_id,
        "user_id": user_id,
        "comment": comment_text,
    }
    insert_row("review_comments", record)
    return record


async def get_review_history(content_id: str) -> Dict[str, Any]:
    """Get complete audit trail of comments and approval stage transitions."""
    content = fetch_one("content_submissions", {"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )

    # Fetch comments joined with user profile
    comments_query = """
    SELECT c.*, COALESCE(p.full_name, p.email, 'Reviewer') as user_name
    FROM review_comments c
    LEFT JOIN profiles p ON c.user_id = p.id
    WHERE c.content_id = ?
    ORDER BY c.created_at ASC
    """
    comments = execute_query(comments_query, (content_id,))

    # Fetch approval transitions joined with reviewer profile
    approvals_query = """
    SELECT a.*, COALESCE(p.full_name, p.email, 'Reviewer') as reviewer_name
    FROM approval_records a
    LEFT JOIN profiles p ON a.reviewer_id = p.id
    WHERE a.content_id = ?
    ORDER BY a.created_at ASC
    """
    approvals = execute_query(approvals_query, (content_id,))

    return {
        "content_id": content_id,
        "current_status": content.get("status", "draft"),
        "comments": comments,
        "approvals": approvals,
    }
