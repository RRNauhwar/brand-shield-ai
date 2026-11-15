"""Analytics reporting endpoints."""

from typing import Dict, Any
import structlog
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.schemas.analytics import (
    AnalyticsOverview,
    ViolationStats,
    TerminologyStats,
    TurnaroundStats,
)
from app.services.analytics_service import (
    get_overview,
    get_violation_stats,
    get_terminology_stats,
    get_review_turnaround,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])


@router.get("/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve overarching audit volume, average score, and approval counts."""
    return await get_overview(org_id=org_id)


@router.get("/violations", response_model=ViolationStats)
async def analytics_violations(
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve violation breakdown by category and severity."""
    return await get_violation_stats(org_id=org_id)


@router.get("/terminology", response_model=TerminologyStats)
async def analytics_terminology(
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve most frequently flagged terminology violations and prohibited words."""
    return await get_terminology_stats(org_id=org_id)


@router.get("/turnaround", response_model=TurnaroundStats)
async def analytics_turnaround(
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve review turnaround metrics and average audit duration."""
    return await get_review_turnaround(org_id=org_id)
