"""Application settings and environment configuration using Pydantic Settings."""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_PATH = _BASE_DIR / ".env"


class Settings(BaseSettings):
    """Core application settings."""

    model_config = SettingsConfigDict(
        env_file=(str(_ENV_PATH), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Environment
    APP_ENV: str = "dev"
    APP_NAME: str = "BrandShield AI"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Supabase credentials
    SUPABASE_URL: Optional[str] = ""
    SUPABASE_KEY: Optional[str] = ""
    SUPABASE_SERVICE_KEY: Optional[str] = ""
    SUPABASE_JWT_SECRET: Optional[str] = None

    # AI Model Providers
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # File Uploads
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_FILE_TYPES: Union[List[str], str] = [
        "pdf",
        "docx",
        "txt",
        "png",
        "jpg",
        "jpeg",
        "webp",
    ]

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "*",
    ]

    @field_validator("SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_SERVICE_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", mode="before")
    @classmethod
    def clean_placeholder_keys(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        cleaned = v.strip()
        # Detect common template placeholder text
        if any(p in cleaned.lower() for p in ("your-", "your_", "your-project", "placeholder", "xxx", "sk-proj-your")):
            return None
        return cleaned

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("ALLOWED_FILE_TYPES", mode="before")
    @classmethod
    def assemble_allowed_file_types(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [file_type.strip().lower() for file_type in v.split(",") if file_type.strip()]
        return [ft.lower() for ft in v]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
