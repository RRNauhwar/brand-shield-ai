"""Vector storage and semantic retrieval service supporting Supabase pgvector and local SQLite NumPy search."""

from typing import List, Dict, Any, Optional
import uuid
import structlog

from app.database.client import (
    call_rpc,
    insert_row,
    delete_rows,
    fetch_all,
)
from app.services.embedding_service import generate_embedding

logger = structlog.get_logger(__name__)


async def store_chunks(
    org_id: str,
    document_id: str,
    chunks: List[Dict[str, Any]],
) -> int:
    """
    Store text chunks and their embeddings in guideline_chunks table with strict organization scoping.
    Expects each chunk dict to have 'content', 'embedding', and optionally 'page_number', 'chunk_index', 'metadata'.
    """
    rows_to_insert = []
    for chunk in chunks:
        row = {
            "id": chunk.get("id") or str(uuid.uuid4()),
            "document_id": document_id,
            "organisation_id": org_id,
            "content": chunk.get("content", ""),
            "page_number": chunk.get("page_number", 1),
            "chunk_index": chunk.get("chunk_index", 0),
            "embedding": chunk.get("embedding"),
            "metadata": chunk.get("metadata", {}),
        }
        rows_to_insert.append(row)

    inserted_count = 0
    for row in rows_to_insert:
        try:
            insert_row("guideline_chunks", row)
            inserted_count += 1
        except Exception as e:
            logger.error("Failed to insert guideline chunk", error=str(e))

    logger.info("Persisted guideline chunks", count=inserted_count, document_id=document_id, org_id=org_id)
    return inserted_count


async def retrieve_relevant_chunks(
    org_id: str,
    query_text: str,
    top_k: int = 5,
    threshold: float = 0.25,
) -> List[Dict[str, Any]]:
    """
    Retrieve most semantically relevant guideline chunks strictly within the specified organisation.
    Uses Supabase RPC 'match_guideline_chunks' with pgvector or SQLite NumPy cosine search.
    If vector search returns no matches, falls back to targeted keyword matching.
    """
    if not query_text or not query_text.strip() or not org_id:
        return []

    # 1. Generate query embedding using configured model (Gemini/OpenAI)
    query_vec = await generate_embedding(query_text)

    # 2. Attempt vector similarity search strictly scoped to org_id
    try:
        rpc_params = {
            "query_embedding": query_vec,
            "match_org_id": org_id,
            "match_count": top_k,
            "match_threshold": threshold,
        }
        rpc_results = call_rpc("match_guideline_chunks", rpc_params)

        if rpc_results and len(rpc_results) > 0:
            formatted = []
            for item in rpc_results:
                # Security guarantee: double-check organisation match
                if item.get("organisation_id") and item.get("organisation_id") != org_id:
                    continue
                meta = item.get("metadata") or {}
                formatted.append({
                    "id": item.get("id"),
                    "text": item.get("content"),
                    "content": item.get("content"),
                    "document_id": item.get("document_id"),
                    "page": item.get("page_number") or meta.get("page_number", 1),
                    "chunk_index": item.get("chunk_index", 0),
                    "similarity": round(float(item.get("similarity", 0.0)), 4),
                    "source_document": meta.get("filename") or "Brand Guidelines",
                    "retrieval_method": "semantic_vector",
                    "metadata": meta,
                })
            if formatted:
                return formatted
    except Exception as e:
        logger.warning("Vector similarity search via RPC failed, falling back to keyword search", error=str(e))

    # 3. Transparent Keyword Search Fallback (strictly scoped to org_id)
    try:
        records = fetch_all("guideline_chunks", {"organisation_id": org_id}, limit=50)
        # Extract meaningful query keywords (stopword-filtered)
        stopwords = {"and", "the", "for", "with", "this", "that", "from", "have", "been", "will", "your", "our"}
        keywords = [
            w.lower().strip(".,!?:;\"'()[]")
            for w in query_text.split()
            if len(w) > 3 and w.lower() not in stopwords
        ][:8]

        if not keywords:
            return []

        results = []
        for r in records:
            content = r.get("content", "")
            content_lower = content.lower()
            matches = [kw for kw in keywords if kw in content_lower]
            if matches:
                # Score based on keyword match density
                match_ratio = len(matches) / len(keywords)
                score = round(0.3 + (match_ratio * 0.5), 3)
                meta = r.get("metadata") or {}
                results.append({
                    "id": r.get("id"),
                    "text": content,
                    "content": content,
                    "document_id": r.get("document_id"),
                    "page": r.get("page_number") or meta.get("page_number", 1),
                    "chunk_index": r.get("chunk_index", 0),
                    "similarity": min(score, 0.85),
                    "source_document": meta.get("filename") or "Brand Guidelines",
                    "retrieval_method": "keyword_search",
                    "metadata": meta,
                })

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]
    except Exception as e:
        logger.error("Keyword fallback guideline chunk query failed", error=str(e))
        return []


async def delete_document_chunks(document_id: str) -> int:
    """Delete all guideline chunks associated with a brand document."""
    try:
        deleted = delete_rows("guideline_chunks", {"document_id": document_id})
        return len(deleted) if isinstance(deleted, list) else 1
    except Exception as e:
        logger.error("Failed to delete document chunks", error=str(e), document_id=document_id)
        return 0
