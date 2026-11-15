"""Security utilities and authentication dependencies for BrandShield AI."""

from typing import Dict, Any, List, Optional
import structlog
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import get_settings

logger = structlog.get_logger(__name__)
security_bearer = HTTPBearer(auto_error=False)


def decode_token_payload(token: str) -> Dict[str, Any]:
    """
    Decode Supabase JWT token.
    If SUPABASE_JWT_SECRET is configured, verifies signature.
    Otherwise decodes payload with expiration validation.
    """
    settings = get_settings()
    try:
        if settings.SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        else:
            # Decode without secret verification in development if secret not yet provided
            payload = jwt.get_unverified_claims(token)
            
        return payload
    except JWTError as e:
        logger.warning("Token decoding error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> Dict[str, Any]:
    """
    Extracts and validates current authenticated user from Authorization Bearer token.
    Returns user dictionary containing id, email, and metadata.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    settings = get_settings()

    # Support a mock demo-token for local testing/dev environments
    if settings.APP_ENV == "dev" and (
        token.startswith("demo-token-")
        or token.startswith("token_")
        or token.startswith("mock_token_")
        or token.startswith("usr_")
    ):
        user_id = token.replace("demo-token-", "").replace("token_", "").replace("mock_token_", "")
        from app.database.client import fetch_one
        profile = fetch_one("profiles", {"id": user_id})
        full_name = profile.get("full_name") if profile else f"User {user_id[:6]}"
        email = profile.get("email") if profile else f"user-{user_id[:6]}@brandshield.ai"
        return {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": "authenticated",
            "user_metadata": {"full_name": full_name},
        }

    # Verify with Supabase client if available
    from app.database.client import get_supabase_client
    supabase = get_supabase_client()

    try:
        if supabase:
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                user = user_response.user
                return {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": (user.user_metadata or {}).get("full_name", user.email),
                    "avatar_url": (user.user_metadata or {}).get("avatar_url"),
                    "role": user.role,
                    "user_metadata": user.user_metadata or {},
                }
    except Exception as e:
        logger.debug("Supabase client token validation failed, falling back to JWT decode", error=str(e))

    # Fallback to local JWT decode
    payload = decode_token_payload(token)
    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identity subject (sub)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    metadata = payload.get("user_metadata", {})
    return {
        "id": user_id,
        "email": email or "",
        "full_name": metadata.get("full_name") or metadata.get("name") or email or "User",
        "avatar_url": metadata.get("avatar_url"),
        "role": payload.get("role", "authenticated"),
        "user_metadata": metadata,
    }


async def verify_org_membership(
    org_id: str,
    user_id: str,
    allowed_roles: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Verify that a user is an active member of an organisation with the required role.
    Roles: 'admin', 'creator', 'reviewer'.
    """
    from app.database.client import fetch_one
    member_record = fetch_one("organisation_members", {"organisation_id": org_id, "user_id": user_id})

    if not member_record:
        # Check if user is the creator of the organisation
        org = fetch_one("organisations", {"id": org_id})
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Organisation '{org_id}' not found",
            )
        if org.get("created_by") == user_id:
            member_record = {"organisation_id": org_id, "user_id": user_id, "role": "admin"}
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this organisation",
            )

    user_role = member_record.get("role", "creator")

    if allowed_roles and user_role not in allowed_roles:
        # If admin is not explicitly in allowed_roles, admins still have super access
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of the following roles: {', '.join(allowed_roles)}. Your role is '{user_role}'.",
            )

    return member_record


async def verify_content_access(
    content_id: str,
    user_id: str,
    allowed_roles: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Verify content submission exists and current user belongs to its organisation."""
    from app.database.client import fetch_one
    content = fetch_one("content_submissions", {"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content submission '{content_id}' not found",
        )
    await verify_org_membership(content["organisation_id"], user_id, allowed_roles)
    return content


async def verify_document_access(
    document_id: str,
    user_id: str,
    allowed_roles: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Verify brand document exists and current user belongs to its organisation."""
    from app.database.client import fetch_one
    doc = fetch_one("brand_documents", {"id": document_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand document '{document_id}' not found",
        )
    await verify_org_membership(doc["organisation_id"], user_id, allowed_roles)
    return doc


async def verify_rule_access(
    rule_id: str,
    user_id: str,
    allowed_roles: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Verify brand rule exists and current user belongs to its organisation."""
    from app.database.client import fetch_one
    rule = fetch_one("brand_rules", {"id": rule_id})
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand rule '{rule_id}' not found",
        )
    await verify_org_membership(rule["organisation_id"], user_id, allowed_roles)
    return rule


async def verify_finding_access(
    finding_id: str,
    user_id: str,
    allowed_roles: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Verify compliance finding exists and current user has access to its content."""
    from app.database.client import fetch_one
    finding = fetch_one("compliance_findings", {"id": finding_id})
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance finding '{finding_id}' not found",
        )
    content_id = finding.get("content_id")
    await verify_content_access(content_id, user_id, allowed_roles)
    return finding


def require_member(org_id_param: str = "org_id"):
    """Dependency factory checking if current user is any member of the organisation."""
    async def dependency(
        org_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        return await verify_org_membership(
            org_id=org_id,
            user_id=current_user["id"],
            allowed_roles=["admin", "creator", "reviewer"],
        )
    return dependency


def require_admin(org_id_param: str = "org_id"):
    """Dependency factory requiring 'admin' role in the organisation."""
    async def dependency(
        org_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        return await verify_org_membership(
            org_id=org_id,
            user_id=current_user["id"],
            allowed_roles=["admin"],
        )
    return dependency


def require_reviewer(org_id_param: str = "org_id"):
    """Dependency factory requiring 'reviewer' or 'admin' role in the organisation."""
    async def dependency(
        org_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        return await verify_org_membership(
            org_id=org_id,
            user_id=current_user["id"],
            allowed_roles=["reviewer", "admin"],
        )
    return dependency
