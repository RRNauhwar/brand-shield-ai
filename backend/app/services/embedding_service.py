"""Embedding generation service supporting Google Gemini, OpenAI text-embedding-3-small, and hash fallback."""

import hashlib
import math
import re
from typing import List, Optional, Dict
import numpy as np
import structlog
from openai import AsyncOpenAI
import google.generativeai as genai

from app.core.config import get_settings

logger = structlog.get_logger(__name__)

EMBEDDING_DIM = 1536
OPENAI_MODEL_NAME = "text-embedding-3-small"
GEMINI_EMBEDDING_MODEL = "models/gemini-embedding-001"

# Fast in-memory embedding cache to avoid redundant external network round trips
_embedding_cache: Dict[str, List[float]] = {}


def _generate_fallback_embedding(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    """
    Deterministic pseudo-semantic 1536-dimensional fallback vector.
    Used ONLY when external embedding API credentials (Gemini/OpenAI) are unavailable or fail.
    Computes word token frequencies and distributes hashed n-gram energies across dimensions,
    then L2-normalizes the resulting vector.
    """
    logger.debug("Generating deterministic fallback vector embedding", text_preview=text[:60])
    vec = np.zeros(dim, dtype=np.float32)

    if not text or not text.strip():
        val = 1.0 / math.sqrt(dim)
        return [float(val)] * dim

    words = re.findall(r"\w+", text.lower())
    for idx, word in enumerate(words):
        h1 = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        h2 = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)

        slot1 = h1 % dim
        slot2 = h2 % dim
        weight = 1.0 / (math.log(idx + 2) + 0.5)

        vec[slot1] += weight * 1.5
        vec[slot2] += weight * 0.8

    for i in range(len(text) - 2):
        trigram = text[i:i + 3].lower()
        h_tri = int(hashlib.sha1(trigram.encode("utf-8")).hexdigest(), 16)
        vec[h_tri % dim] += 0.2

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    else:
        vec[0] = 1.0

    return vec.tolist()


async def generate_embedding(text: str) -> List[float]:
    """
    Generate a 1536-dimensional embedding vector for a single text string.
    Prioritizes Google Gemini, falls back to OpenAI, then deterministic fallback.
    """
    settings = get_settings()
    cleaned_text = text.replace("\n", " ").strip()
    if not cleaned_text:
        return _generate_fallback_embedding("")

    cache_key = hashlib.sha256(cleaned_text.encode("utf-8")).hexdigest()
    if cache_key in _embedding_cache:
        return _embedding_cache[cache_key]

    # 1. Primary: Google Gemini Embeddings
    if settings.GEMINI_API_KEY:
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            res = genai.embed_content(
                model=GEMINI_EMBEDDING_MODEL,
                content=cleaned_text,
                output_dimensionality=EMBEDDING_DIM,
            )
            emb = res.get("embedding")
            if emb and len(emb) == EMBEDDING_DIM:
                _embedding_cache[cache_key] = emb
                return emb
        except Exception as e:
            logger.warning("Gemini embedding generation failed, falling back", error=str(e))

    # 2. Secondary: OpenAI Embeddings
    if settings.OPENAI_API_KEY:
        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.embeddings.create(
                input=[cleaned_text],
                model=OPENAI_MODEL_NAME,
            )
            emb = response.data[0].embedding
            _embedding_cache[cache_key] = emb
            return emb
        except Exception as e:
            logger.warning("OpenAI embedding generation failed, using fallback", error=str(e))

    # 3. Deterministic Local Fallback
    fallback = _generate_fallback_embedding(cleaned_text)
    _embedding_cache[cache_key] = fallback
    return fallback


async def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of texts in batch.
    Prioritizes Google Gemini, falls back to OpenAI, then deterministic fallback.
    """
    if not texts:
        return []

    settings = get_settings()
    cleaned_texts = [t.replace("\n", " ").strip() or " " for t in texts]

    # 1. Primary: Google Gemini Embeddings
    if settings.GEMINI_API_KEY:
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            # Batch in chunks of 50
            batch_size = 50
            all_embeddings = []
            for i in range(0, len(cleaned_texts), batch_size):
                sub_batch = cleaned_texts[i:i + batch_size]
                res = genai.embed_content(
                    model=GEMINI_EMBEDDING_MODEL,
                    content=sub_batch,
                    output_dimensionality=EMBEDDING_DIM,
                )
                embs = res.get("embedding", [])
                all_embeddings.extend(embs)
            if len(all_embeddings) == len(cleaned_texts):
                return all_embeddings
        except Exception as e:
            logger.warning("Batch Gemini embedding generation failed, falling back", error=str(e))

    # 2. Secondary: OpenAI Embeddings
    if settings.OPENAI_API_KEY:
        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            batch_size = 50
            all_embeddings = []
            for i in range(0, len(cleaned_texts), batch_size):
                sub_batch = cleaned_texts[i:i + batch_size]
                response = await client.embeddings.create(
                    input=sub_batch,
                    model=OPENAI_MODEL_NAME,
                )
                all_embeddings.extend([item.embedding for item in response.data])
            return all_embeddings
        except Exception as e:
            logger.warning("Batch OpenAI embedding generation failed, falling back", error=str(e))

    # 3. Deterministic Local Fallback
    return [_generate_fallback_embedding(t) for t in cleaned_texts]
