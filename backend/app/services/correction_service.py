"""Correction service handling acceptance, rejection, and manual editing of compliance findings."""

import uuid
from typing import Dict, Any, Optional
import structlog
from fastapi import HTTPException, status

from app.database.client import (
    fetch_one,
    fetch_all,
    insert_row,
    update_row,
)

logger = structlog.get_logger(__name__)


async def accept_correction(
    finding_id: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Accepts a suggested compliance correction:
    1. Replaces the problematic text in current_content with suggested_correction.
    2. Logs a revision record in revision_history.
    3. Updates finding status to 'accepted'.
    """
    finding = fetch_one("compliance_findings", {"id": finding_id})
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance finding with ID '{finding_id}' not found",
        )

    content_id = finding.get("content_id")
    content = fetch_one("content_submissions", {"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )

    current_text = content.get("current_content") or content.get("original_content", "")
    suggested = finding.get("suggested_correction")
    original = finding.get("original_text", "")

    if not suggested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finding does not contain a suggested correction to automatically apply.",
        )

    # Perform text replacement
    new_text = current_text
    if original and original != "(Entire content reviewed)" and original in new_text:
        new_text = new_text.replace(original, suggested, 1)
    elif finding.get("category") == "Missing Disclaimer":
        # Disclaimer append
        new_text = f"{new_text.rstrip()}\n\n{suggested}"
    else:
        # If snippet couldn't be cleanly matched verbatim, replace first occurrence of target words
        cleaned_orig = original.strip().split("\n")[0]
        if cleaned_orig in new_text:
            new_text = new_text.replace(cleaned_orig, suggested, 1)
        else:
            new_text = f"{new_text.rstrip()}\n\n{suggested}"

    # Update content
    update_row("content_submissions", {"id": content_id}, {"current_content": new_text})

    # Update finding status
    update_row("compliance_findings", {"id": finding_id}, {"status": "accepted"})

    # Record revision history
    insert_row(
        "revision_history",
        {
            "id": str(uuid.uuid4()),
            "content_id": content_id,
            "finding_id": finding_id,
            "previous_text": current_text,
            "new_text": new_text,
            "action": "correction_accepted",
            "performed_by": user_id,
        },
    )

    return {
        "status": "success",
        "action": "correction_accepted",
        "finding_id": finding_id,
        "content_id": content_id,
        "new_content": new_text,
    }


async def reject_correction(
    finding_id: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Marks a finding as rejected without altering content."""
    finding = fetch_one("compliance_findings", {"id": finding_id})
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance finding with ID '{finding_id}' not found",
        )

    update_row("compliance_findings", {"id": finding_id}, {"status": "rejected"})

    return {
        "status": "success",
        "action": "correction_rejected",
        "finding_id": finding_id,
    }


async def edit_correction(
    finding_id: str,
    custom_text: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Applies custom user text for a finding:
    1. Replaces problematic text in current_content with custom_text.
    2. Logs a revision in revision_history.
    3. Updates finding status to 'manually_edited'.
    """
    finding = fetch_one("compliance_findings", {"id": finding_id})
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance finding with ID '{finding_id}' not found",
        )

    content_id = finding.get("content_id")
    content = fetch_one("content_submissions", {"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )

    current_text = content.get("current_content") or content.get("original_content", "")
    original = finding.get("original_text", "")

    if original and original in current_text:
        new_text = current_text.replace(original, custom_text, 1)
    else:
        new_text = f"{current_text.rstrip()}\n\n{custom_text}"

    update_row("content_submissions", {"id": content_id}, {"current_content": new_text})
    update_row("compliance_findings", {"id": finding_id}, {"status": "manually_edited"})
    insert_row(
        "revision_history",
        {
            "id": str(uuid.uuid4()),
            "content_id": content_id,
            "finding_id": finding_id,
            "previous_text": current_text,
            "new_text": new_text,
            "action": "manual_edit",
            "performed_by": user_id,
        },
    )

    return {
        "status": "success",
        "action": "manual_edit",
        "finding_id": finding_id,
        "content_id": content_id,
        "new_content": new_text,
    }


async def ignore_correction(
    finding_id: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Marks a finding as ignored by reviewer."""
    finding = fetch_one("compliance_findings", {"id": finding_id})
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance finding with ID '{finding_id}' not found",
        )

    update_row("compliance_findings", {"id": finding_id}, {"status": "ignored"})

    return {
        "status": "success",
        "action": "correction_ignored",
        "finding_id": finding_id,
    }


async def get_corrected_content(content_id: str) -> Dict[str, Any]:
    """Returns the current content along with all accepted revision history."""
    content = fetch_one("content_submissions", {"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )

    revisions = fetch_all("revision_history", {"content_id": content_id}, order_by="created_at", desc=False)

    return {
        "content_id": content_id,
        "title": content.get("title"),
        "original_content": content.get("original_content"),
        "current_content": content.get("current_content"),
        "revision_count": len(revisions),
        "revisions": revisions,
    }
