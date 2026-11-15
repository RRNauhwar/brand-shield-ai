"""Analytics and reporting schemas."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AnalyticsOverview(BaseModel):
    total_audits: int = 0
    total_findings: int = 0
    approved_content: int = 0
    pending_reviews: int = 0
    rejected_content: int = 0
    average_compliance_score: float = 0.0


class ViolationCategoryStat(BaseModel):
    category: str
    count: int
    percentage: float = 0.0


class ViolationSeverityStat(BaseModel):
    severity: str
    count: int


class ViolationStats(BaseModel):
    total_violations: int = 0
    by_category: List[ViolationCategoryStat] = Field(default_factory=list)
    by_severity: List[ViolationSeverityStat] = Field(default_factory=list)


class TerminologyStatItem(BaseModel):
    term: str
    replacement: Optional[str] = None
    count: int = 0
    category: str = "Terminology Violation"


class TerminologyStats(BaseModel):
    frequently_flagged_terms: List[TerminologyStatItem] = Field(default_factory=list)
    prohibited_terms_detected: int = 0


class TurnaroundStats(BaseModel):
    average_review_time_hours: float = 0.0
    average_audit_duration_seconds: float = 0.0
    submissions_reviewed_count: int = 0
