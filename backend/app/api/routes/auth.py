"""Authentication endpoints for user registration, login, profile, and logout."""

import uuid
from typing import Dict, Any
import structlog
from fastapi import APIRouter, HTTPException, Depends, status

from app.core.config import get_settings
from app.core.security import get_current_user
from app.database.client import (
    get_supabase_client,
    get_supabase_admin_client,
    insert_row,
    fetch_one,
)
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserProfile,
    TokenResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister):
    """Register a new user account with Supabase Auth."""
    supabase = get_supabase_client()
    admin_supabase = get_supabase_admin_client()
    settings = get_settings()

    if not supabase:
        # Development / SQLite mode
        mock_id = str(uuid.uuid4())
        user_profile = UserProfile(
            id=mock_id,
            email=payload.email,
            full_name=payload.full_name,
        )
        insert_row("profiles", {
            "id": mock_id,
            "email": payload.email,
            "full_name": payload.full_name,
        })
        return TokenResponse(
            access_token=f"demo-token-{mock_id}",
            token_type="bearer",
            user=user_profile,
        )

    try:
        auth_response = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {
                "data": {
                    "full_name": payload.full_name,
                }
            },
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User registration failed",
            )

        user_id = str(auth_response.user.id)
        token = auth_response.session.access_token if auth_response.session else f"demo-token-{user_id}"

        # Create or update profile record in database
        if admin_supabase:
            try:
                profile_data = {
                    "id": user_id,
                    "email": payload.email,
                    "full_name": payload.full_name,
                }
                admin_supabase.table("profiles").upsert(profile_data).execute()
            except Exception as e:
                logger.warning("Failed to create profile row in database", error=str(e))

        user_profile = UserProfile(
            id=user_id,
            email=payload.email,
            full_name=payload.full_name,
            avatar_url=None,
        )

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_profile,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Registration error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    """Authenticate existing user credentials."""
    supabase = get_supabase_client()
    admin_supabase = get_supabase_admin_client()

    if not supabase:
        # Development / SQLite mode
        existing = fetch_one("profiles", {"email": payload.email})
        if existing:
            mock_id = existing["id"]
            full_name = existing.get("full_name") or payload.email.split("@")[0].capitalize()
        else:
            mock_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, payload.email))
            full_name = payload.email.split("@")[0].capitalize()
            insert_row("profiles", {"id": mock_id, "email": payload.email, "full_name": full_name})

        return TokenResponse(
            access_token=f"demo-token-{mock_id}",
            token_type="bearer",
            user=UserProfile(
                id=mock_id,
                email=payload.email,
                full_name=full_name,
            ),
        )

    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password,
        })

        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        user = auth_response.user
        user_id = str(user.id)
        token = auth_response.session.access_token

        # Query profile table for updated display name and avatar
        profile = None
        if admin_supabase:
            profile = fetch_one("profiles", {"id": user_id}, client=admin_supabase)

        full_name = (
            (profile or {}).get("full_name")
            or (user.user_metadata or {}).get("full_name")
            or user.email
        )
        avatar_url = (profile or {}).get("avatar_url") or (user.user_metadata or {}).get("avatar_url")

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserProfile(
                id=user_id,
                email=user.email,
                full_name=full_name,
                avatar_url=avatar_url,
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login failure", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


@router.get("/me", response_model=UserProfile)
@router.get("/profile", response_model=UserProfile)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve profile of currently authenticated user."""
    user_id = current_user["id"]
    profile = fetch_one("profiles", {"id": user_id})
    if profile:
        return UserProfile(
            id=user_id,
            email=profile.get("email") or current_user.get("email", ""),
            full_name=profile.get("full_name") or current_user.get("full_name", ""),
            avatar_url=profile.get("avatar_url") or current_user.get("avatar_url"),
        )

    return UserProfile(
        id=user_id,
        email=current_user.get("email", ""),
        full_name=current_user.get("full_name", ""),
        avatar_url=current_user.get("avatar_url"),
    )


@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Sign out current user."""
    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.auth.sign_out()
        except Exception as e:
            logger.debug("Sign out error", error=str(e))

    return {"message": "Logged out successfully"}
