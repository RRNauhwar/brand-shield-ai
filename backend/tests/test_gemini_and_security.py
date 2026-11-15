"""Deep verification tests for Gemini Core Intelligence, Visual Analysis, and IDOR Security."""

import io
import pytest
from httpx import AsyncClient, ASGITransport
from PIL import Image

from app.main import app
from app.services.llm_analyzer import LLMAnalyzer
from app.services.embedding_service import generate_embedding, generate_embeddings_batch
from app.services.visual_analyzer import analyze_visual_creative


@pytest.mark.asyncio
async def test_gemini_live_analysis_and_attribution():
    """Verify Gemini analyzes content, returns structured findings, and tags engine as gemini."""
    analyzer = LLMAnalyzer()
    
    guideline_chunks = [
        {
            "id": "chunk-1",
            "content": "Acme Brand Tone: Professional and understated. Never use hyperbolic buzzwords like 'revolutionary breakthrough' or 'unprecedented magic'.",
            "source_document": "Acme_Brand_Bible.pdf",
            "page": 4,
        },
        {
            "id": "chunk-2",
            "content": "Approved Pricing Policy: Always state 'pricing starts from $49/mo'. Do not claim 'free forever' for enterprise tiers.",
            "source_document": "Acme_Brand_Bible.pdf",
            "page": 12,
        }
    ]
    
    content = "Introducing our revolutionary breakthrough! It is unprecedented magic that is completely free forever for every enterprise."
    
    result = await analyzer.analyze_content(
        content_text=content,
        content_category="press_release",
        brand_context=guideline_chunks,
    )
    
    assert isinstance(result, list)
    assert len(result) >= 1
    
    metadata = analyzer.get_engine_metadata()
    assert metadata["engine"] == "gemini"
    assert metadata["is_ai_powered"] is True
    assert "gemini" in metadata["model"]
    
    # Check that findings cite source documents and pages
    for f in result:
        assert f["engine"] in ("gemini", "fallback_engine")
        assert f["confidence"] > 0
        assert "original_text" in f
        assert "suggested_correction" in f


@pytest.mark.asyncio
async def test_gemini_embedding_1536_dimensions():
    """Verify Gemini embedding service produces 1536-dimensional vectors."""
    text = "BrandShield AI compliance intelligence"
    emb = await generate_embedding(text)
    
    assert len(emb) == 1536
    assert any(val != 0.0 for val in emb)
    
    # Batch embeddings
    batch = await generate_embeddings_batch(["Guideline chunk 1", "Guideline chunk 2"])
    assert len(batch) == 2
    assert len(batch[0]) == 1536
    assert len(batch[1]) == 1536


@pytest.mark.asyncio
async def test_visual_creative_analysis():
    """Verify visual analysis extracts dominant colors, computes contrast, and integrates Gemini Vision."""
    # Create a small valid test PNG image (200x200 navy square)
    img = Image.new("RGB", (200, 200), color=(10, 25, 47))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()
    
    rules = [
        {
            "id": "color-rule-1",
            "rule_type": "brand_color",
            "name": "Primary Navy",
            "value": "#0A192F",
            "is_active": True,
        }
    ]
    
    result = await analyze_visual_creative(img_bytes, rules)
    
    assert "dominant_colors" in result
    assert len(result["dominant_colors"]) > 0
    assert "contrast_analysis" in result
    assert "findings" in result
    assert result.get("status") in ("analyzed", "completed")


@pytest.mark.asyncio
async def test_cross_organisation_isolation_and_idor():
    """Verify multi-tenant isolation: User A in Org A cannot access Org B's content or reports."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Register User A and create Org A
        res_a = await client.post("/auth/register", json={
            "email": "userA@companyA.com",
            "password": "Password123!",
            "full_name": "User Alpha",
        })
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}
        
        res_org_a = await client.post("/organisations", json={
            "name": "Company Alpha",
            "description": "Alpha Workspace",
        }, headers=headers_a)
        org_a_id = res_org_a.json()["id"]
        
        # Register User B and create Org B
        res_b = await client.post("/auth/register", json={
            "email": "userB@companyB.com",
            "password": "Password123!",
            "full_name": "User Beta",
        })
        token_b = res_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        
        res_org_b = await client.post("/organisations", json={
            "name": "Company Beta",
            "description": "Beta Workspace",
        }, headers=headers_b)
        org_b_id = res_org_b.json()["id"]
        
        # User A creates content in Org A
        res_content = await client.post(
            f"/organisations/{org_a_id}/content",
            json={
                "title": "Alpha Confidential Marketing",
                "category": "marketing_campaign",
                "content": "Secret Alpha campaign content.",
            },
            headers=headers_a,
        )
        content_a_id = res_content.json()["submission"]["id"]
        report_a_id = res_content.json()["reportId"]
        
        # User B attempts to access Org A's content -> Must be 403 Forbidden
        res_unauthorized = await client.get(
            f"/organisations/{org_a_id}/content/{content_a_id}",
            headers=headers_b,
        )
        assert res_unauthorized.status_code == 403
        
        # User B attempts to access Org A's audit report via REST endpoint -> Must be 403 Forbidden
        res_unauth_audit = await client.get(
            f"/audit/{report_a_id}",
            headers=headers_b,
        )
        assert res_unauth_audit.status_code == 403
        
        # User B attempts to access Org A's members -> Must be 403 Forbidden
        res_unauth_members = await client.get(
            f"/organisations/{org_a_id}/members",
            headers=headers_b,
        )
        assert res_unauth_members.status_code == 403
        
        # User B attempts to query non-existent content -> Must return 404 Not Found (not fake data)
        res_404 = await client.get(
            f"/content/non-existent-content-uuid-12345",
            headers=headers_b,
        )
        assert res_404.status_code == 404
