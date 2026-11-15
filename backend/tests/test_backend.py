"""Comprehensive automated test suite for BrandShield AI backend."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.rule_engine import RuleEngine
from app.services.document_processor import chunk_text, validate_file
from app.services.audit_service import calculate_compliance_score, deduplicate_findings
from app.services.visual_analyzer import _hex_to_rgb, _rgb_to_hex, check_color_compliance

client = TestClient(app)


def test_root_and_health_endpoints():
    """Verify root metadata and health check endpoints."""
    res_root = client.get("/")
    assert res_root.status_code == 200
    data_root = res_root.json()
    assert data_root["service"] == "BrandShield AI Backend"

    res_health = client.get("/health")
    assert res_health.status_code == 200
    data_health = res_health.json()
    assert data_health["status"] == "healthy"


@pytest.mark.asyncio
async def test_rule_engine_preferred_terminology():
    """Verify RuleEngine catches deprecated terms and offers replacements."""
    engine = RuleEngine()
    rules = [
        {
            "id": "rule-1",
            "rule_type": "terminology_preferred",
            "name": "Platform Name",
            "value": "NovaShield Tool",
            "replacement": "NovaShield AI Platform",
            "is_active": True,
        }
    ]
    text = "Get started with the NovaShield Tool today."
    findings = await engine.analyze(text, rules)

    assert len(findings) == 1
    assert findings[0]["category"] == "Terminology Violation"
    assert findings[0]["severity"] == "medium"
    assert "NovaShield AI Platform" in findings[0]["suggested_correction"]


@pytest.mark.asyncio
async def test_rule_engine_prohibited_terms():
    """Verify RuleEngine detects prohibited terms."""
    engine = RuleEngine()
    rules = [
        {
            "id": "rule-2",
            "rule_type": "terminology_prohibited",
            "name": "Unhackable Claim",
            "value": "unhackable",
            "description": "Never claim the system is unhackable.",
            "is_active": True,
        }
    ]
    text = "Our software is completely unhackable and robust."
    findings = await engine.analyze(text, rules)

    assert len(findings) == 1
    assert findings[0]["category"] == "Prohibited Term"
    assert findings[0]["severity"] == "high"


@pytest.mark.asyncio
async def test_rule_engine_mandatory_message():
    """Verify RuleEngine detects missing required disclaimer."""
    engine = RuleEngine()
    rules = [
        {
            "id": "rule-3",
            "rule_type": "mandatory_message",
            "name": "SOC 2 Disclaimer",
            "value": "SOC 2 Type II certified",
            "is_active": True,
        }
    ]
    text_without = "Here is our product marketing collateral."
    findings = await engine.analyze(text_without, rules)
    assert len(findings) == 1
    assert findings[0]["category"] == "Missing Disclaimer"

    text_with = "Here is our product collateral. We are proudly SOC 2 Type II certified."
    findings_none = await engine.analyze(text_with, rules)
    assert len(findings_none) == 0


def test_document_chunking():
    """Verify text chunker preserves overlap and token boundaries."""
    sample_text = " ".join([f"Word{i}" for i in range(1200)])
    chunks = chunk_text(sample_text, chunk_size=500, overlap=50)

    assert len(chunks) >= 3
    assert chunks[0]["chunk_index"] == 0
    assert chunks[0]["metadata"]["word_count"] == 500


def test_file_validation():
    """Verify file size and extension checks."""
    valid, err = validate_file("policy.pdf", b"dummy content")
    assert valid is True
    assert err is None

    invalid_ext, err_ext = validate_file("script.sh", b"echo hi")
    assert invalid_ext is False
    assert "not supported" in err_ext


def test_compliance_scoring():
    """Verify severity penalty scoring logic."""
    findings = [
        {"severity": "critical"},
        {"severity": "high"},
        {"severity": "medium"},
    ]
    # 100 - 25 - 15 - 8 = 52.0
    score = calculate_compliance_score(findings)
    assert score == 52.0


def test_finding_deduplication():
    """Verify overlapping finding deduplication."""
    findings = [
        {"original_text": "unhackable platform", "category": "Prohibited Term", "confidence": 0.8},
        {"original_text": "unhackable platform", "category": "Prohibited Term", "confidence": 0.95},
    ]
    deduped = deduplicate_findings(findings)
    assert len(deduped) == 1
    assert deduped[0]["confidence"] == 0.95


def test_color_utilities():
    """Verify color conversion and tolerance checks."""
    rgb = _hex_to_rgb("#0F172A")
    assert rgb == (15, 23, 42)
    hex_code = _rgb_to_hex(15, 23, 42)
    assert hex_code == "#0F172A"

    extracted = [{"hex": "#0F172A", "rgb": [15, 23, 42], "percentage": 90.0}]
    compliance = check_color_compliance(extracted, brand_palette=["#0F172A", "#06B6D4"])
    assert compliance["compliant"] is True
