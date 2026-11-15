"""End-to-end integration tests for BrandShield AI.

Verifies the entire functional workflow:
1. User registration & authentication
2. Organisation creation
3. Brand guideline upload & vector chunking
4. Brand rule creation (terminology & prohibited terms)
5. Content submission & extraction
6. Automated compliance audit & evidence retrieval
7. Correction acceptance & revision history
8. Human review workflow (submission -> approval)
9. Governance analytics from real database records
"""

import io
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_full_brandshield_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200
        health = res.json()
        assert health["status"] == "healthy"

        # 2. Register new user
        reg_payload = {
            "email": "sarah.connor@cyberdyne.ai",
            "password": "SecurePassword123!",
            "full_name": "Sarah Connor",
        }
        res = await client.post("/auth/register", json=reg_payload)
        assert res.status_code in (200, 201)
        auth_data = res.json()
        token = auth_data["access_token"]
        user_id = auth_data["user"]["id"]
        assert token
        assert auth_data["user"]["email"] == "sarah.connor@cyberdyne.ai"

        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create Organisation Workspace
        org_payload = {
            "name": "Cyberdyne Brand Systems",
            "description": "Autonomous security and governance technology",
        }
        res = await client.post("/organisations", json=org_payload, headers=headers)
        assert res.status_code in (200, 201)
        org = res.json()
        org_id = org["id"]
        assert org["name"] == "Cyberdyne Brand Systems"

        # Verify listing user organisations
        res = await client.get("/organisations", headers=headers)
        assert res.status_code == 200
        orgs = res.json()
        assert any(o["id"] == org_id for o in orgs)

        # 4. Upload Brand Guideline Document
        guideline_content = (
            "CYBERDYNE BRAND GUIDELINES 2026\n\n"
            "Brand Voice and Tone:\n"
            "Our voice is authoritative, visionary, and dependable. Avoid hyperbolic language.\n"
            "Terminology Guidelines:\n"
            "Always use 'cost-effective' or 'value-driven' instead of 'cheap'.\n"
            "Never claim 'unbreakable' or '100% bug-free'. All security systems must use qualified terminology.\n"
            "Mandatory Disclosures:\n"
            "All enterprise marketing communications must include the disclaimer: "
            "'Cyberdyne Systems is a registered trademark. Terms and limitations apply.'\n"
        )
        file_bytes = guideline_content.encode("utf-8")
        files = {
            "file": ("Cyberdyne_Brand_Guidelines_2026.txt", io.BytesIO(file_bytes), "text/plain"),
        }
        data = {"org_id": org_id}
        res = await client.post(f"/organisations/{org_id}/documents", files=files, headers=headers)
        assert res.status_code in (200, 201)
        doc = res.json()
        assert doc["chunk_count"] > 0
        assert doc["status"] == "ready"

        # 5. Create Deterministic Brand Governance Rules
        rule_term = {
            "rule_type": "preferred_terminology",
            "name": "Cost Effective Terminology",
            "value": "cheap",
            "replacement": "cost-effective",
            "description": "Never refer to products as cheap; use cost-effective instead.",
            "is_active": True,
        }
        res = await client.post(f"/organisations/{org_id}/rules", json=rule_term, headers=headers)
        assert res.status_code in (200, 201)
        rule_term_res = res.json()
        assert rule_term_res["value"] == "cheap"

        rule_claim = {
            "rule_type": "prohibited_claim",
            "name": "Absolute Security Claim",
            "value": "100% bug-free",
            "replacement": "enterprise-grade verified reliability",
            "description": "Never claim 100% bug-free operation.",
            "is_active": True,
        }
        res = await client.post(f"/organisations/{org_id}/rules", json=rule_claim, headers=headers)
        assert res.status_code in (200, 201)

        # Verify rules listed
        res = await client.get(f"/organisations/{org_id}/rules", headers=headers)
        assert res.status_code == 200
        rules = res.json()
        assert len(rules) >= 2

        # 6. Submit Content for Compliance Review
        content_draft = (
            "Introducing the new Cyberdyne Defense Matrix. "
            "Our solution is exceptionally cheap compared to legacy alternatives. "
            "Furthermore, our software is 100% bug-free and guarantees total immunity."
        )
        content_payload = {
            "title": "Defense Matrix Launch Press Release",
            "category": "press_release",
            "content": content_draft,
            "content_type": "text",
        }
        res = await client.post(f"/organisations/{org_id}/content", json=content_payload, headers=headers)
        assert res.status_code in (200, 201)
        content_res = res.json()
        content_id = content_res["submission"]["id"]
        report = content_res["report"]

        assert content_id
        assert report["id"]
        assert report["total_findings"] >= 2
        assert report["overall_score"] < 100.0

        # Verify findings flagged the specific violations
        finding_texts = [f["original_text"].lower() for f in report["findings"]]
        assert any("cheap" in t for t in finding_texts)

        # 7. Apply suggested correction for 'cheap'
        cheap_finding = next(f for f in report["findings"] if "cheap" in f["original_text"].lower())
        patch_payload = {
            "status": "accepted",
        }
        res = await client.patch(
            f"/organisations/{org_id}/content/{content_id}/findings/{cheap_finding['id']}",
            json=patch_payload,
            headers=headers,
        )
        assert res.status_code == 200
        patch_res = res.json()
        assert "cost-effective" in patch_res["submission"]["current_content"].lower()

        # Check revision history recorded
        res = await client.get(f"/organisations/{org_id}/content/{content_id}/revisions", headers=headers)
        assert res.status_code == 200
        revisions = res.json()
        assert len(revisions) >= 1
        assert revisions[0]["action"] == "correction_accepted"

        # 8. Submit for Human Approval Workflow
        submit_review_payload = {
            "notes": "Addressed terminology feedback; ready for editorial review.",
        }
        res = await client.post(
            f"/organisations/{org_id}/content/{content_id}/submit-review",
            json=submit_review_payload,
            headers=headers,
        )
        assert res.status_code == 200
        reviewed_content = res.json()
        assert reviewed_content["status"] == "under_review"

        # Reviewer approves submission
        approve_payload = {
            "comment": "Editorial and compliance guidelines satisfied. Approved for publication.",
        }
        res = await client.post(
            f"/organisations/{org_id}/content/{content_id}/approve",
            json=approve_payload,
            headers=headers,
        )
        assert res.status_code == 200
        approved_content = res.json()
        assert approved_content["status"] == "approved"

        # Verify approval history trail
        res = await client.get(f"/organisations/{org_id}/content/{content_id}/approvals", headers=headers)
        assert res.status_code == 200
        approvals = res.json()
        assert len(approvals) >= 2
        actions = [a["action"] for a in approvals]
        assert "submitted" in actions
        assert "approved" in actions

        # 9. Verify Governance Analytics computes accurately from real DB records
        res = await client.get(f"/organisations/{org_id}/analytics/overview", headers=headers)
        assert res.status_code == 200
        analytics = res.json()
        assert analytics["total_audits"] >= 1
        assert analytics["approved_content"] == 1
        assert analytics["total_findings"] >= 2
        assert analytics["average_compliance_score"] > 0

        res = await client.get(f"/organisations/{org_id}/analytics/violations", headers=headers)
        assert res.status_code == 200
        violations = res.json()
        assert violations["total_violations"] >= 2
        assert len(violations["by_category"]) >= 1
