"""BrandShield AI FastAPI application entrypoint."""

import time
from contextlib import asynccontextmanager
from typing import Dict, Any
import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.database.client import check_database_connection, get_supabase_admin_client

# Route imports
from app.api.routes.auth import router as auth_router
from app.api.routes.organisations import router as organisations_router
from app.api.routes.brand import router as brand_router
from app.api.routes.content import router as content_router
from app.api.routes.audit import router as audit_router
from app.api.routes.corrections import router as corrections_router
from app.api.routes.reviews import router as reviews_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.demo import router as demo_router
from app.api.routes.campaigns import router as campaigns_router
from app.api.routes.repair import router as repair_router

# Configure structlog
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer() if get_settings().APP_ENV == "prod" else structlog.dev.ConsoleRenderer(),
    ]
)
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    settings = get_settings()
    logger.info(
        "Starting BrandShield AI Backend",
        environment=settings.APP_ENV,
        max_file_size_mb=settings.MAX_FILE_SIZE_MB,
        cors_origins=settings.CORS_ORIGINS,
    )
    # Check DB connectivity
    db_status = await check_database_connection()
    logger.info("Database connectivity status", **db_status)

    # Auto-seed demo workspace if database is fresh
    try:
        from app.database.client import fetch_all
        from app.api.routes.demo import setup_demo_workspace
        orgs = fetch_all("organisations")
        rules = fetch_all("brand_rules")
        if not orgs or not rules:
            logger.info("Fresh database or empty rules detected. Auto-seeding NovaTech demo workspace...")
            await setup_demo_workspace(current_user=None)
            logger.info("NovaTech demo workspace auto-seeded successfully!")
    except Exception as e:
        logger.warning("Could not auto-seed demo workspace on startup", error=str(e))

    yield
    logger.info("Shutting down BrandShield AI Backend")


settings = get_settings()

app = FastAPI(
    title="BrandShield AI Backend",
    description="Enterprise Multi-Engine Brand Safety, Compliance, and Voice Verification Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
origins = (
    settings.CORS_ORIGINS
    if isinstance(settings.CORS_ORIGINS, list)
    else [origin.strip() for origin in str(settings.CORS_ORIGINS).split(",")]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response


# Global Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on request", path=request.url.path, errors=exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Request validation failed", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred", "error": str(exc)},
    )


# Include Routers under API_V1_PREFIX, /api, and root prefix for seamless proxy compatibility
api_prefix = settings.API_V1_PREFIX
routers = [
    auth_router,
    organisations_router,
    brand_router,
    content_router,
    audit_router,
    corrections_router,
    reviews_router,
    analytics_router,
    demo_router,
    campaigns_router,
    repair_router,
]

for pfx in set([api_prefix, "/api", ""]):
    for r in routers:
        app.include_router(r, prefix=pfx)


@app.get("/", tags=["Health"])
async def root():
    """Root metadata endpoint."""
    return {
        "service": "BrandShield AI Backend",
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs",
        "api_v1_prefix": settings.API_V1_PREFIX,
    }


@app.get("/ping", tags=["Health"])
async def ping():
    """Ultra-fast zero-allocation liveness probe."""
    return {"status": "ok", "timestamp": time.time()}


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint evaluating database connectivity."""
    db_health = await check_database_connection()
    return {
        "status": "healthy",
        "database": db_health,
        "environment": settings.APP_ENV,
        "timestamp": time.time(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
