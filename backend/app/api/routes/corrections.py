"""Correction resolution endpoints for accepting, rejecting, and editing compliance findings."""

from typing import Dict, Any
import structlog
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user, verify_finding_access
from app.schemas.review import EditCorrectionRequest
from app.services.correction_service import (
    accept_correction,
    reject_correction,
    edit_correction,
    ignore_correction,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/corrections", tags=["Finding Corrections"])


@router.post("/{finding_id}/accept")
async def accept_finding_correction(
    finding_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Accept the suggested correction for a compliance finding:
    Applies the correction directly to the content draft and records revision history.
    """
    await verify_finding_access(finding_id, current_user["id"])
    return await accept_correction(finding_id=finding_id, user_id=current_user["id"])


@router.post("/{finding_id}/reject")
async def reject_finding_correction(
    finding_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Reject a suggested correction without altering content."""
    await verify_finding_access(finding_id, current_user["id"])
    return await reject_correction(finding_id=finding_id, user_id=current_user["id"])


@router.post("/{finding_id}/edit")
async def edit_finding_correction(
    finding_id: str,
    payload: EditCorrectionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Provide custom replacement text for a flagged snippet."""
    await verify_finding_access(finding_id, current_user["id"])
    return await edit_correction(
        finding_id=finding_id,
        custom_text=payload.custom_text,
        user_id=current_user["id"],
    )


@router.post("/{finding_id}/ignore")
async def ignore_finding_correction(
    finding_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Mark a finding as acknowledged and ignored."""
    await verify_finding_access(finding_id, current_user["id"])
    return await ignore_correction(finding_id=finding_id, user_id=current_user["id"])
