"""SQLAlchemy-style database entity models for BrandShield AI reference."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class ProfileModel:
    id: str
    email: str
    full_name: str = ""
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class OrganisationModel:
    id: str
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_demo: bool = False
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class OrganisationMemberModel:
    id: str
    organisation_id: str
    user_id: str
    role: str  # admin, creator, reviewer
    joined_at: Optional[datetime] = None


@dataclass
class BrandDocumentModel:
    id: str
    organisation_id: str
    name: str
    file_type: str
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    status: str = "processing"  # processing, ready, error
    chunk_count: int = 0
    uploaded_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class GuidelineChunkModel:
    id: str
    document_id: str
    organisation_id: str
    content: str
    page_number: Optional[int] = None
    chunk_index: Optional[int] = None
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None


@dataclass
class BrandRuleModel:
    id: str
    organisation_id: str
    rule_type: str  # terminology_preferred, terminology_prohibited, approved_fact, mandatory_message, brand_voice, brand_color
    name: str
    value: str
    replacement: Optional[str] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class BrandAssetModel:
    id: str
    organisation_id: str
    name: str
    asset_type: str  # logo, image, icon, color_palette
    file_url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    uploaded_by: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class ContentSubmissionModel:
    id: str
    organisation_id: str
    title: str
    category: str  # social_media, marketing_campaign, advertisement, blog_article, product_description, email_marketing
    original_content: str
    current_content: str
    content_type: str = "text"  # text, pdf, docx, image
    file_url: Optional[str] = None
    status: str = "draft"  # draft, audited, under_review, changes_requested, approved, rejected
    submitted_by: Optional[str] = None
    assigned_reviewer: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class AuditReportModel:
    id: str
    content_id: str
    organisation_id: str
    overall_score: float = 0.0
    total_findings: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    info_count: int = 0
    summary: Optional[str] = None
    processing_time_seconds: Optional[float] = None
    created_at: Optional[datetime] = None


@dataclass
class ComplianceFindingModel:
    id: str
    audit_id: str
    content_id: str
    category: str
    severity: str  # critical, high, medium, low, informational
    original_text: str
    explanation: str
    guideline_reference: Optional[str] = None
    evidence: Optional[str] = None
    source_document: Optional[str] = None
    source_page: Optional[int] = None
    suggested_correction: Optional[str] = None
    confidence: float = 0.5
    status: str = "open"  # open, accepted, rejected, manually_edited, ignored
    engine: str = "unknown"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class RevisionHistoryModel:
    id: str
    content_id: str
    finding_id: Optional[str] = None
    previous_text: str = ""
    new_text: str = ""
    action: str = "manual_edit"  # correction_accepted, manual_edit, revert
    performed_by: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class ReviewCommentModel:
    id: str
    content_id: str
    user_id: Optional[str] = None
    comment: str = ""
    created_at: Optional[datetime] = None


@dataclass
class ApprovalRecordModel:
    id: str
    content_id: str
    reviewer_id: Optional[str] = None
    action: str = "submitted"  # submitted, approved, rejected, changes_requested, commented
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    comment: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class AuditEventModel:
    id: str
    organisation_id: str
    event_type: str
    event_data: Dict[str, Any] = field(default_factory=dict)
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
