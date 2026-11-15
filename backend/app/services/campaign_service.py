"""Campaign War Room service orchestrating multi-channel audits and cross-channel consistency analysis."""

import uuid
import json
from typing import Dict, Any, List, Optional
import structlog
from fastapi import HTTPException, status

from app.database.client import (
    fetch_one,
    fetch_all,
    insert_row,
    update_row,
    delete_rows,
    execute_query,
)
from app.services.audit_service import run_audit
from app.services.llm_analyzer import LLMAnalyzer
from app.schemas.campaign import CampaignCreate, CampaignAssetCreate

logger = structlog.get_logger(__name__)


async def create_campaign(org_id: str, payload: CampaignCreate, user_id: str) -> Dict[str, Any]:
    """Create a new campaign and optionally register initial multi-channel assets."""
    campaign_id = str(uuid.uuid4())
    channels_json = json.dumps(payload.channels)

    campaign_data = {
        "id": campaign_id,
        "organisation_id": org_id,
        "name": payload.name,
        "brief": payload.brief or "",
        "target_audience": payload.target_audience or "",
        "objective": payload.objective or "",
        "channels": channels_json,
        "status": "draft",
        "overall_score": 0.0,
        "total_assets": len(payload.assets or []),
        "cross_channel_findings": json.dumps([]),
        "created_by": user_id,
    }
    insert_row("campaigns", campaign_data)

    created_assets = []
    if payload.assets:
        for a in payload.assets:
            asset_res = await add_asset_to_campaign(campaign_id, org_id, a, user_id)
            created_assets.append(asset_res)

    return await get_campaign_details(campaign_id, org_id)


async def add_asset_to_campaign(
    campaign_id: str,
    org_id: str,
    payload: CampaignAssetCreate,
    user_id: str,
) -> Dict[str, Any]:
    """Add a channel asset (text copy or visual creative) to a campaign."""
    asset_id = str(uuid.uuid4())
    content_id = str(uuid.uuid4())

    # Create associated content submission so it integrates seamlessly with audit & approvals
    content_record = {
        "id": content_id,
        "organisation_id": org_id,
        "title": f"[{payload.channel.upper()}] {payload.title}",
        "category": "marketing_campaign",
        "original_content": payload.content,
        "current_content": payload.content,
        "content_type": payload.asset_type,
        "file_url": payload.file_url,
        "status": "draft",
        "submitted_by": user_id,
    }
    insert_row("content_submissions", content_record)

    asset_data = {
        "id": asset_id,
        "campaign_id": campaign_id,
        "organisation_id": org_id,
        "content_id": content_id,
        "channel": payload.channel.lower(),
        "title": payload.title,
        "content": payload.content,
        "asset_type": payload.asset_type,
        "file_url": payload.file_url,
        "score": 0.0,
        "issues_count": 0,
        "risk_level": "low",
    }
    insert_row("campaign_assets", asset_data)

    # Increment campaign asset count
    campaign = fetch_one("campaigns", {"id": campaign_id})
    if campaign:
        total = (campaign.get("total_assets") or 0) + 1
        update_row("campaigns", {"id": campaign_id}, {"total_assets": total})

    return asset_data


async def get_campaign_details(campaign_id: str, org_id: str) -> Dict[str, Any]:
    """Get full campaign dashboard data including assets, scores, and cross-channel intelligence."""
    campaign = fetch_one("campaigns", {"id": campaign_id, "organisation_id": org_id})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    assets = fetch_all("campaign_assets", {"campaign_id": campaign_id}, order_by="created_at", desc=False)

    channels = []
    try:
        channels = json.loads(campaign.get("channels") or "[]")
    except Exception:
        channels = ["website", "social", "email"]

    cross_findings = []
    try:
        cross_findings = json.loads(campaign.get("cross_channel_findings") or "[]")
    except Exception:
        cross_findings = []

    return {
        "id": campaign["id"],
        "organisation_id": campaign["organisation_id"],
        "name": campaign["name"],
        "title": campaign["name"],
        "brief": campaign.get("brief", ""),
        "description": campaign.get("brief", ""),
        "target_audience": campaign.get("target_audience", ""),
        "objective": campaign.get("objective", ""),
        "channels": channels,
        "status": campaign.get("status", "draft"),
        "overall_score": float(campaign.get("overall_score") or 0.0),
        "total_assets": len(assets),
        "cross_channel_findings": cross_findings,
        "assets": assets,
        "created_by": campaign.get("created_by"),
        "created_at": campaign.get("created_at"),
        "updated_at": campaign.get("updated_at"),
    }


async def list_campaigns(org_id: str) -> List[Dict[str, Any]]:
    """List all campaigns for an organisation."""
    campaigns = fetch_all("campaigns", {"organisation_id": org_id}, order_by="created_at", desc=True)
    results = []
    for c in campaigns:
        assets = fetch_all("campaign_assets", {"campaign_id": c["id"]})
        channels = []
        try:
            channels = json.loads(c.get("channels") or "[]")
        except Exception:
            channels = []
        cross_findings = []
        try:
            cross_findings = json.loads(c.get("cross_channel_findings") or "[]")
        except Exception:
            cross_findings = []

        results.append({
            "id": c["id"],
            "organisation_id": c["organisation_id"],
            "name": c["name"],
            "brief": c.get("brief", ""),
            "target_audience": c.get("target_audience", ""),
            "objective": c.get("objective", ""),
            "channels": channels,
            "status": c.get("status", "draft"),
            "overall_score": float(c.get("overall_score") or 0.0),
            "total_assets": len(assets),
            "cross_channel_findings": cross_findings,
            "assets": assets,
            "created_at": c.get("created_at"),
        })
    return results


async def run_campaign_audit(campaign_id: str, org_id: str) -> Dict[str, Any]:
    """
    Launch comprehensive Campaign War Room audit:
    1. Audits every campaign asset individually (Gemini 2.5 Flash + OpenCV + Brand Rules).
    2. Runs Cross-Channel Consistency Intelligence across all channels.
    3. Calculates holistic campaign compliance health score.
    """
    campaign = fetch_one("campaigns", {"id": campaign_id, "organisation_id": org_id})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    assets = fetch_all("campaign_assets", {"campaign_id": campaign_id})
    if not assets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign contains no marketing assets to audit.",
        )

    analyzer = LLMAnalyzer()
    asset_scores = []
    audited_assets_payload = []

    # 1. Audit each asset individually
    for a in assets:
        content_id = a.get("content_id")
        if not content_id:
            continue

        report = await run_audit(content_id=content_id, org_id=org_id)
        score = float(report.overall_score)
        issues = int(report.total_findings)

        risk = "low"
        if report.critical_count > 0:
            risk = "critical"
        elif report.high_count > 0:
            risk = "high"
        elif report.medium_count > 0:
            risk = "medium"

        update_row("campaign_assets", {"id": a["id"]}, {
            "score": score,
            "issues_count": issues,
            "risk_level": risk,
            "audit_id": report.id,
        })
        asset_scores.append(score)
        audited_assets_payload.append({
            "id": a["id"],
            "channel": a.get("channel", "general"),
            "title": a.get("title", "Asset"),
            "content": a.get("content", ""),
        })

    # 2. Retrieve brand guidelines for cross-channel grounding
    guideline_chunks = fetch_all("guideline_chunks", {"organisation_id": org_id}, limit=10)

    # 3. Execute Cross-Channel Consistency Intelligence
    cross_channel_findings = await analyzer.analyze_campaign_consistency(
        campaign_name=campaign.get("name", "Campaign"),
        campaign_brief=campaign.get("brief", ""),
        assets=audited_assets_payload,
        brand_guidelines=guideline_chunks,
    )

    # 4. Calculate Aggregate Campaign Score
    base_avg_score = sum(asset_scores) / max(len(asset_scores), 1) if asset_scores else 100.0
    cross_penalties = 0.0
    for cf in cross_channel_findings:
        sev = cf.get("severity", "medium").lower()
        if sev == "critical":
            cross_penalties += 12.0
        elif sev == "high":
            cross_penalties += 8.0
        elif sev == "medium":
            cross_penalties += 5.0
        else:
            cross_penalties += 2.0

    final_campaign_score = max(0.0, min(100.0, round(base_avg_score - cross_penalties, 1)))

    update_row("campaigns", {"id": campaign_id}, {
        "status": "audited",
        "overall_score": final_campaign_score,
        "cross_channel_findings": json.dumps(cross_channel_findings),
    })

    return await get_campaign_details(campaign_id, org_id)
