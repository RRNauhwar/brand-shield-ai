"""Organisation and membership schemas."""

from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, EmailStr


class MemberRole(str, Enum):
    ADMIN = "admin"
    CREATOR = "creator"
    REVIEWER = "reviewer"


class OrganisationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None


class OrganisationResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_demo: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class OrganisationMember(BaseModel):
    id: Optional[str] = None
    organisation_id: str
    user_id: str
    role: str
    joined_at: Optional[datetime] = None
    email: Optional[str] = None
    full_name: Optional[str] = None


class InviteMember(BaseModel):
    email: str
    role: MemberRole = MemberRole.CREATOR


class UpdateMemberRole(BaseModel):
    role: MemberRole
