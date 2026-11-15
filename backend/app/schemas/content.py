"""Content submission and revision schemas."""

from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field


class ContentCategory(str, Enum):
    SOCIAL_MEDIA = "social_media"
    MARKETING_CAMPAIGN = "marketing_campaign"
    ADVERTISEMENT = "advertisement"
    BLOG_ARTICLE = "blog_article"
    PRODUCT_DESCRIPTION = "product_description"
    EMAIL_MARKETING = "email_marketing"


class ContentType(str, Enum):
    TEXT = "text"
    PDF = "pdf"
    DOCX = "docx"
    IMAGE = "image"


class ContentStatus(str, Enum):
    DRAFT = "draft"
    AUDITED = "audited"
    UNDER_REVIEW = "under_review"
    CHANGES_REQUESTED = "changes_requested"
    APPROVED = "approved"
    REJECTED = "rejected"


class ContentSubmission(BaseModel):
    title: str
    category: ContentCategory
    text_content: str = Field(description="Raw text content or extracted file content")
    content_type: ContentType = ContentType.TEXT
    assigned_reviewer: Optional[str] = None


class ContentResponse(BaseModel):
    id: str
    organisation_id: str
    title: str
    category: ContentCategory
    original_content: str
    current_content: str
    content_type: ContentType
    file_url: Optional[str] = None
    status: ContentStatus
    submitted_by: Optional[str] = None
    assigned_reviewer: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RevisionHistoryItem(BaseModel):
    id: str
    content_id: str
    finding_id: Optional[str] = None
    previous_text: str
    new_text: str
    action: str  # correction_accepted, manual_edit, revert
    performed_by: Optional[str] = None
    performer_name: Optional[str] = None
    created_at: Optional[datetime] = None
