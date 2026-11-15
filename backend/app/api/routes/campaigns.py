"""Campaign War Room API routes for multi-channel campaign audits and cross-channel intelligence."""

from typing import Dict, Any, List
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user, verify_org_membership
from app.schemas.campaign import (
    CampaignCreate,
    CampaignResponse,
    CampaignAssetCreate,
    CampaignAssetResponse,
)
from app.services.campaign_service import (
    create_campaign,
    list_campaigns,
    get_campaign_details,
    add_asset_to_campaign,
    run_campaign_audit,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/campaigns", tags=["Campaign War Room"])


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_new_campaign(
    payload: CampaignCreate,
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new multi-channel marketing campaign in the War Room."""
    await verify_org_membership(org_id, current_user["id"])
    return await create_campaign(org_id=org_id, payload=payload, user_id=current_user["id"])


@router.get("", response_model=List[CampaignResponse])
async def get_organisation_campaigns(
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all campaigns for an organisation."""
    await verify_org_membership(org_id, current_user["id"])
    return await list_campaigns(org_id=org_id)


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_single_campaign(
    campaign_id: str,
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve campaign dashboard with all channel assets and cross-channel intelligence."""
    await verify_org_membership(org_id, current_user["id"])
    return await get_campaign_details(campaign_id=campaign_id, org_id=org_id)


@router.post("/{campaign_id}/assets", response_model=CampaignAssetResponse)
async def add_campaign_asset(
    campaign_id: str,
    payload: CampaignAssetCreate,
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Add a channel asset (e.g. Instagram copy, website landing page, email newsletter) to a campaign."""
    await verify_org_membership(org_id, current_user["id"])
    return await add_asset_to_campaign(
        campaign_id=campaign_id,
        org_id=org_id,
        payload=payload,
        user_id=current_user["id"],
    )


@router.post("/{campaign_id}/audit", response_model=CampaignResponse)
async def trigger_campaign_audit(
    campaign_id: str,
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Launch comprehensive Campaign War Room audit:
    Audits every asset and executes Gemini cross-channel contradiction analysis.
    """
    await verify_org_membership(org_id, current_user["id"])
    return await run_campaign_audit(campaign_id=campaign_id, org_id=org_id)
