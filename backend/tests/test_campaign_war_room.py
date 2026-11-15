"""Verification tests for Campaign War Room and AI Repair Studio."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_campaign_war_room_lifecycle():
    """Verify creating a campaign with multiple channel assets, running audit, and checking cross-channel findings."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Register user and create org
        res_auth = await client.post("/auth/register", json={
            "email": "warroom.lead@acmegov.com",
            "password": "Password123!",
            "full_name": "War Room Lead",
        })
        token = res_auth.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res_org = await client.post("/organisations", json={
            "name": "Acme Global Brands",
            "description": "Multi-channel enterprise campaigns",
        }, headers=headers)
        org_id = res_org.json()["id"]

        # Create Campaign with 2 conflicting channel assets
        campaign_payload = {
            "name": "Q4 Cloud Launch",
            "brief": "Promote CloudShield Pro across Instagram and Website landing page.",
            "target_audience": "Enterprise Security Directors",
            "objective": "Lead Generation",
            "channels": ["instagram", "website"],
            "assets": [
                {
                    "title": "Website Hero & Pricing",
                    "channel": "website",
                    "content": "Deploy CloudShield Pro today. Pricing starts from $49/mo with verified 99.99% uptime and enterprise support.",
                    "asset_type": "text",
                },
                {
                    "title": "Instagram Social Ad Copy",
                    "channel": "instagram",
                    "content": "Get CloudShield Pro completely free forever! Our revolutionary unhackable tool guarantees 100% bug-free security.",
                    "asset_type": "text",
                }
            ]
        }

        res_campaign = await client.post(f"/campaigns?org_id={org_id}", json=campaign_payload, headers=headers)
        assert res_campaign.status_code == 201
        campaign_data = res_campaign.json()
        campaign_id = campaign_data["id"]
        assert len(campaign_data["assets"]) == 2

        # Launch War Room Audit
        res_audit = await client.post(f"/campaigns/{campaign_id}/audit?org_id={org_id}", headers=headers)
        assert res_audit.status_code == 200
        audit_data = res_audit.json()

        assert audit_data["status"] == "audited"
        assert audit_data["overall_score"] < 100.0  # Due to violations and clashes
        assert len(audit_data["assets"]) == 2

        # Test Smart Repair Endpoint
        repair_payload = {
            "original_text": "Our revolutionary unhackable tool guarantees 100% bug-free security.",
            "explanation": "Prohibits 'unhackable' and '100% bug-free'.",
            "guideline_reference": "Brand Messaging Guidelines",
            "instruction": "Tone should remain confident and engaging.",
        }
        res_repair = await client.post("/repair/suggest", json=repair_payload, headers=headers)
        assert res_repair.status_code == 200
        repair_data = res_repair.json()
        assert "repaired_text" in repair_data
        assert "safety_rationale" in repair_data
        assert "diff_summary" in repair_data
