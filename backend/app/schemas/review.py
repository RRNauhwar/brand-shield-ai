"""Review, approval workflow, and comment schemas."""

from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field


class ApprovalAction(str, Enum):
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"
    COMMENTED = "commented"


class ReviewSubmit(BaseModel):
    assigned_reviewer: Optional[str] = None
    note: Optional[str] = None


class ReviewComment(BaseModel):
    comment: str = Field(min_length=1)


class ReviewAction(BaseModel):
    action: ApprovalAction
    comment: Optional[str] = None


class EditCorrectionRequest(BaseModel):
    custom_text: str


class CommentResponse(BaseModel):
    id: str
    content_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    comment: str
    created_at: Optional[datetime] = None


class ApprovalRecordResponse(BaseModel):
    id: str
    content_id: str
    reviewer_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    action: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    comment: Optional[str] = None
    created_at: Optional[datetime] = None


class ReviewHistoryResponse(BaseModel):
    content_id: str
    current_status: str
    comments: List[CommentResponse] = Field(default_factory=list)
    approvals: List[ApprovalRecordResponse] = Field(default_factory=list)
