"""Campaign War Room and Multi-Channel Governance schemas."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator
from datetime import datetime


class CampaignAssetCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    channel: str = Field(..., description="Channel: instagram, linkedin, website, email, ad_creative, press_release")
    content: str = Field(..., min_length=5, description="Copy or text body of the asset")
    asset_type: str = Field("text", description="text or image")
    file_url: Optional[str] = None


class CampaignCreate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    brief: Optional[str] = None
    description: Optional[str] = None
    target_audience: Optional[str] = Field(None, max_length=255)
    objective: Optional[str] = Field(None, max_length=255)
    channels: List[str] = Field(default_factory=lambda: ["instagram", "linkedin", "website"])
    assets: Optional[List[CampaignAssetCreate]] = None

    @model_validator(mode="after")
    def populate_name_and_brief(self):
        if not self.name and self.title:
            self.name = self.title
        elif not self.title and self.name:
            self.title = self.name
        if not self.name:
            raise ValueError("Campaign name or title is required")
        if not self.brief and self.description:
            self.brief = self.description
        elif not self.description and self.brief:
            self.description = self.brief
        return self


class CrossChannelFinding(BaseModel):
    id: str
    category: str
    severity: str
    title: str
    channel_a: str
    channel_b: str
    asset_a_title: str
    asset_b_title: str
    asset_a_excerpt: str
    asset_b_excerpt: str
    explanation: str
    guideline_reference: Optional[str] = None
    reconciliation_suggestion: str
    confidence: float = 0.90
    engine: str = "gemini"


class CampaignAssetResponse(BaseModel):
    id: str
    campaign_id: str
    organisation_id: str
    content_id: Optional[str] = None
    channel: str
    title: str
    content: Optional[str] = None
    asset_type: str = "text"
    file_url: Optional[str] = None
    score: float = 0.0
    issues_count: int = 0
    risk_level: str = "low"
    audit_id: Optional[str] = None
    created_at: Optional[str] = None


class CampaignResponse(BaseModel):
    id: str
    organisation_id: str
    name: str
    title: Optional[str] = None
    brief: Optional[str] = None
    description: Optional[str] = None
    target_audience: Optional[str] = None
    objective: Optional[str] = None
    channels: List[str] = []
    status: str = "draft"
    overall_score: float = 0.0
    total_assets: int = 0
    cross_channel_findings: List[CrossChannelFinding] = []
    assets: List[CampaignAssetResponse] = []
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @model_validator(mode="after")
    def sync_title_and_description(self):
        if not self.title and self.name:
            self.title = self.name
        if not self.description and self.brief:
            self.description = self.brief
        return self


class SmartRepairRequest(BaseModel):
    content_id: Optional[str] = None
    original_text: str
    finding_id: Optional[str] = None
    violation_category: Optional[str] = None
    guideline_reference: Optional[str] = None
    explanation: Optional[str] = None
    instruction: Optional[str] = None


class SmartRepairResponse(BaseModel):
    repaired_text: str
    diff_summary: str
    safety_rationale: str
    engine: str = "gemini"
    model: str = "gemini-2.5-flash"
    changes: List[Dict[str, str]] = []
