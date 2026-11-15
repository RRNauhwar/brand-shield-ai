"""Audit reports and compliance finding schemas."""

from datetime import datetime
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class FindingCategory(str, Enum):
    UNSUPPORTED_CLAIM = "Unsupported Claim"
    TERMINOLOGY_VIOLATION = "Terminology Violation"
    PROHIBITED_TERM = "Prohibited Term"
    MISSING_DISCLAIMER = "Missing Disclaimer"
    TONE_INCONSISTENCY = "Tone Inconsistency"
    FACTUAL_MISMATCH = "Factual Mismatch"
    MESSAGING_INCONSISTENCY = "Messaging Inconsistency"
    ACCESSIBILITY_ISSUE = "Accessibility Issue"
    VISUAL_INCONSISTENCY = "Visual Inconsistency"
    BRAND_VOICE_DEVIATION = "Brand Voice Deviation"
    EXAGGERATED_CLAIM = "Exaggerated Claim"
    OUTDATED_INFORMATION = "Outdated Information"


class FindingStatus(str, Enum):
    OPEN = "open"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    MANUALLY_EDITED = "manually_edited"
    IGNORED = "ignored"


class ComplianceFinding(BaseModel):
    id: Optional[str] = None
    audit_id: Optional[str] = None
    content_id: Optional[str] = None
    category: str
    severity: Severity
    original_text: str
    explanation: str
    guideline_reference: Optional[str] = None
    evidence: Optional[str] = None
    source_document: Optional[str] = None
    source_page: Optional[int] = None
    suggested_correction: Optional[str] = None
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)
    status: FindingStatus = FindingStatus.OPEN
    engine: str = "unknown"  # "rule_engine", "rag_engine", "llm_engine"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AuditReport(BaseModel):
    id: Optional[str] = None
    content_id: str
    organisation_id: str
    overall_score: float = Field(ge=0.0, le=100.0)
    total_findings: int
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    info_count: int = 0
    findings: List[ComplianceFinding] = Field(default_factory=list)
    summary: str
    engine: str = "gemini"  # "gemini", "openai", "hybrid_gemini_rules", "fallback_engine"
    is_ai_powered: bool = True
    ai_model: Optional[str] = "gemini-2.5-flash"
    created_at: Optional[datetime] = None
    processing_time_seconds: Optional[float] = None
