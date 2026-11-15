"""Brand documents, rules, assets, and guideline search schemas."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class RuleType(str, Enum):
    TERMINOLOGY_PREFERRED = "terminology_preferred"
    TERMINOLOGY_PROHIBITED = "terminology_prohibited"
    APPROVED_FACT = "approved_fact"
    MANDATORY_MESSAGE = "mandatory_message"
    BRAND_VOICE = "brand_voice"
    BRAND_COLOR = "brand_color"


class AssetType(str, Enum):
    LOGO = "logo"
    IMAGE = "image"
    ICON = "icon"
    COLOR_PALETTE = "color_palette"


class BrandDocumentUpload(BaseModel):
    id: str
    name: str
    file_type: str
    status: str
    chunk_count: int = 0
    message: str = "Document uploaded and queued for processing"


class BrandDocumentResponse(BaseModel):
    id: str
    organisation_id: str
    name: str
    file_type: str
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    status: str
    chunk_count: int = 0
    uploaded_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BrandRuleCreate(BaseModel):
    rule_type: RuleType
    name: str
    value: str
    replacement: Optional[str] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class BrandRuleUpdate(BaseModel):
    rule_type: Optional[RuleType] = None
    name: Optional[str] = None
    value: Optional[str] = None
    replacement: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class BrandRuleResponse(BaseModel):
    id: str
    organisation_id: str
    rule_type: str
    name: str
    value: str
    replacement: Optional[str] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BrandAssetResponse(BaseModel):
    id: str
    organisation_id: str
    name: str
    asset_type: str
    file_url: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    uploaded_by: Optional[str] = None
    created_at: Optional[datetime] = None


class GuidelineSearchResult(BaseModel):
    id: Optional[str] = None
    content: str
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    page_number: Optional[int] = None
    chunk_index: Optional[int] = None
    similarity: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)
