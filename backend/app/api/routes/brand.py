"""Brand guidelines, documents, rules, assets, and vector search endpoints."""

import uuid
from typing import List, Optional, Dict, Any
import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status

from app.core.security import (
    get_current_user,
    verify_org_membership,
    verify_document_access,
    verify_rule_access,
)
from app.database.client import (
    get_supabase_admin_client,
    fetch_one,
    fetch_all,
    insert_row,
    update_row,
    delete_rows,
)
from app.schemas.brand import (
    RuleType,
    BrandDocumentUpload,
    BrandDocumentResponse,
    BrandRuleCreate,
    BrandRuleUpdate,
    BrandRuleResponse,
    BrandAssetResponse,
    GuidelineSearchResult,
)
from app.services.document_processor import process_document_bytes, validate_file
from app.services.embedding_service import generate_embeddings_batch
from app.services.retrieval_service import store_chunks, retrieve_relevant_chunks, delete_document_chunks

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/brand", tags=["Brand Guidelines & Rules"])


# --- Document Upload & Management ---

@router.post("/documents", response_model=BrandDocumentUpload, status_code=status.HTTP_201_CREATED)
async def upload_brand_document(
    file: UploadFile = File(...),
    org_id: str = Form(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Upload a brand guideline document (PDF, DOCX, TXT), extract text,
    generate vector embeddings, and store chunks for RAG compliance checks.
    """
    await verify_org_membership(org_id, current_user["id"])
    supabase = get_supabase_admin_client()
    contents = await file.read()
    filename = file.filename or "guideline.txt"

    is_valid, err_msg = validate_file(filename, contents)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    doc_id = str(uuid.uuid4())
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    # Insert document record in processing state
    doc_record = {
        "id": doc_id,
        "organisation_id": org_id,
        "name": filename,
        "file_type": ext,
        "file_size": len(contents),
        "status": "processing",
        "chunk_count": 0,
        "uploaded_by": current_user["id"],
    }
    insert_row("brand_documents", doc_record)

    try:
        # Process document text into chunks
        processed = process_document_bytes(filename, contents)
        chunks = processed.get("chunks", [])

        # Generate embeddings in batch
        chunk_texts = [c["content"] for c in chunks]
        embeddings = await generate_embeddings_batch(chunk_texts)

        for c, emb in zip(chunks, embeddings):
            c["embedding"] = emb

        # Store chunks in Supabase or SQLite
        stored_count = await store_chunks(org_id, doc_id, chunks)

        # Update document record status to ready
        update_row(
            "brand_documents",
            {"id": doc_id},
            {"status": "ready", "chunk_count": stored_count},
        )

        return BrandDocumentUpload(
            id=doc_id,
            name=filename,
            file_type=ext,
            status="ready",
            chunk_count=stored_count,
            message=f"Document processed successfully into {stored_count} semantic chunks.",
        )
    except Exception as e:
        logger.error("Failed to process brand document", error=str(e), doc_id=doc_id)
        update_row("brand_documents", {"id": doc_id}, {"status": "error"})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {str(e)}",
        )


@router.get("/documents", response_model=List[BrandDocumentResponse])
async def list_brand_documents(
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all uploaded brand guideline documents for an organisation."""
    await verify_org_membership(org_id, current_user["id"])
    return fetch_all("brand_documents", {"organisation_id": org_id}, order_by="created_at", desc=True)


@router.delete("/documents/{id}")
async def delete_brand_document(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete a brand document and its vector embeddings."""
    await verify_document_access(id, current_user["id"])
    await delete_document_chunks(id)
    delete_rows("brand_documents", {"id": id})
    return {"message": "Brand document and associated vector chunks removed successfully"}


# --- Brand Rules ---

@router.post("/rules", response_model=BrandRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_brand_rule(
    payload: BrandRuleCreate,
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new deterministic brand rule."""
    await verify_org_membership(org_id, current_user["id"])
    rule_id = str(uuid.uuid4())
    rule_data = {
        "id": rule_id,
        "organisation_id": org_id,
        "rule_type": payload.rule_type.value,
        "name": payload.name,
        "value": payload.value,
        "replacement": payload.replacement,
        "description": payload.description,
        "metadata": payload.metadata,
        "is_active": payload.is_active,
        "created_by": current_user["id"],
    }
    insert_row("brand_rules", rule_data)
    return rule_data


@router.get("/rules", response_model=List[BrandRuleResponse])
async def list_brand_rules(
    org_id: str = Query(...),
    rule_type: Optional[RuleType] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List brand rules for an organisation, optionally filtered by rule type."""
    await verify_org_membership(org_id, current_user["id"])
    match: Dict[str, Any] = {"organisation_id": org_id}
    if rule_type:
        match["rule_type"] = rule_type.value
    return fetch_all("brand_rules", match, order_by="created_at", desc=True)


@router.put("/rules/{id}", response_model=BrandRuleResponse)
async def update_brand_rule(
    id: str,
    payload: BrandRuleUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update an existing brand rule."""
    await verify_rule_access(id, current_user["id"])
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "rule_type" in update_data and isinstance(update_data["rule_type"], RuleType):
        update_data["rule_type"] = update_data["rule_type"].value

    updated = update_row("brand_rules", {"id": id}, update_data)
    if not updated:
        rule = fetch_one("brand_rules", {"id": id})
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
        return rule
    return updated


@router.delete("/rules/{id}")
async def delete_brand_rule(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete a brand rule."""
    await verify_rule_access(id, current_user["id"])
    delete_rows("brand_rules", {"id": id})
    return {"message": "Brand rule deleted successfully"}


# --- Brand Assets ---

@router.post("/assets", response_model=BrandAssetResponse, status_code=status.HTTP_201_CREATED)
async def upload_brand_asset(
    file: UploadFile = File(...),
    org_id: str = Form(...),
    asset_type: str = Form("logo"),
    name: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Upload brand asset (logo, color palette specification, or reference graphic)."""
    await verify_org_membership(org_id, current_user["id"])
    contents = await file.read()
    asset_id = str(uuid.uuid4())
    display_name = name or file.filename or "Brand Asset"

    asset_data = {
        "id": asset_id,
        "organisation_id": org_id,
        "name": display_name,
        "asset_type": asset_type,
        "file_url": f"/storage/assets/{asset_id}/{file.filename}",
        "metadata": {"size_bytes": len(contents), "filename": file.filename},
        "uploaded_by": current_user["id"],
    }
    insert_row("brand_assets", asset_data)
    return asset_data


@router.get("/assets", response_model=List[BrandAssetResponse])
async def list_brand_assets(
    org_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List brand assets for an organisation."""
    await verify_org_membership(org_id, current_user["id"])
    return fetch_all("brand_assets", {"organisation_id": org_id})


@router.delete("/assets/{id}")
async def delete_brand_asset(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete a brand asset."""
    asset = fetch_one("brand_assets", {"id": id})
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand asset not found")
    await verify_org_membership(asset["organisation_id"], current_user["id"])
    delete_rows("brand_assets", {"id": id})
    return {"message": "Brand asset deleted successfully"}


# --- Semantic Search in Guidelines ---

@router.get("/search", response_model=List[GuidelineSearchResult])
async def search_guidelines(
    org_id: str = Query(...),
    query: str = Query(..., min_length=2),
    top_k: int = Query(5, ge=1, le=20),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Search brand guidelines using vector similarity search."""
    await verify_org_membership(org_id, current_user["id"])
    chunks = await retrieve_relevant_chunks(org_id=org_id, query_text=query, top_k=top_k)
    results = []
    for c in chunks:
        results.append(
            GuidelineSearchResult(
                id=c.get("id"),
                content=c.get("content") or c.get("text", ""),
                document_id=c.get("document_id"),
                document_name=c.get("source_document"),
                page_number=c.get("page"),
                chunk_index=c.get("chunk_index"),
                similarity=float(c.get("similarity", 0.0)),
                metadata=c.get("metadata", {}),
            )
        )
    return results
