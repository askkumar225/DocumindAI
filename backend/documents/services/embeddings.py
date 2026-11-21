"""
Embedding generation service.

Converts text into dense vector representations using OpenAI's
text-embedding-3-small model (1536 dimensions).

When no API key is configured (dev/test), returns a zero vector so the
pipeline can still run without crashing — semantic search will simply
return no meaningful results until a real key is provided.

Architecture:
    chunk text
        ↓
    embed_text(text) → list[float]  (length = EMBEDDING_DIM)
        ↓
    stored in DocumentChunk.embedding (JSONField)

Batch embedding:
    embed_texts(texts) sends a single API request for a list of texts,
    which is more efficient than calling embed_text in a loop.
"""

import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

# ─── Placeholder detection ────────────────────────────────────────────────────

_PLACEHOLDER_KEYS = {
    "", "your_openai_api_key_here", "your_api_key_here",
    "sk-...", "YOUR_API_KEY",
}


def _is_valid_api_key(key: str) -> bool:
    """Return True only when the key is a real, non-placeholder value."""
    return bool(key) and key.strip() not in _PLACEHOLDER_KEYS


# ─── Dimension ────────────────────────────────────────────────────────────────

def get_embedding_dim() -> int:
    return getattr(settings, "EMBEDDING_DIM", 1536)


def _zero_vector() -> list[float]:
    """Return a zero vector used as a safe fallback when embedding fails."""
    return [0.0] * get_embedding_dim()


# ─── Single text embedding ────────────────────────────────────────────────────

def embed_text(text: str) -> list[float]:
    """
    Convert a single text string into an embedding vector.

    Returns a zero vector if the API key is missing/placeholder or the call fails.
    """
    if not text.strip():
        return _zero_vector()

    api_key: str = getattr(settings, "LLM_API_KEY", "").strip()

    if not _is_valid_api_key(api_key):
        logger.warning(
            "LLM_API_KEY not set or is a placeholder — returning zero vector. "
            "Set a real key in backend/.env to enable real embeddings."
        )
        return _zero_vector()

    result = _call_openai_embedding([text])
    return result[0] if result else _zero_vector()


# ─── Batch embedding ──────────────────────────────────────────────────────────

_BATCH_SIZE = 100   # OpenAI recommends ≤ 2048 items; 100 is safe for large texts


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Convert a list of text strings into embedding vectors.

    Sends requests in batches of _BATCH_SIZE to stay within provider limits.
    Returns zero vectors if the API key is missing/placeholder or the call fails.
    """
    if not texts:
        return []

    api_key: str = getattr(settings, "LLM_API_KEY", "").strip()

    if not _is_valid_api_key(api_key):
        logger.warning(
            "LLM_API_KEY not set or is a placeholder — returning zero vectors for %d texts.",
            len(texts),
        )
        return [_zero_vector() for _ in texts]

    results: list[list[float]] = []
    expected_dim = get_embedding_dim()

    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i : i + _BATCH_SIZE]
        try:
            batch_vecs = _call_openai_embedding(batch)
        except Exception as exc:
            logger.error("embed_texts batch %d failed: %s", i, exc)
            results.extend([_zero_vector() for _ in batch])
            continue

        # Validate each returned vector's dimension
        validated: list[list[float]] = []
        dim_ok = True
        for vec in batch_vecs:
            if not vec or len(vec) != expected_dim:
                logger.error(
                    "Embedding dimension mismatch: expected %d, got %d. "
                    "Returning zero vectors for this batch.",
                    expected_dim, len(vec) if vec else 0,
                )
                dim_ok = False
                break
            validated.append(vec)

        if dim_ok:
            results.extend(validated)
        else:
            results.extend([_zero_vector() for _ in batch])

    return results


# ─── OpenAI API call ──────────────────────────────────────────────────────────

_MAX_CHARS_PER_TEXT = 8000   # ~2000 tokens for text-embedding-3-small


def _call_openai_embedding(texts: list[str]) -> list[list[float]]:
    """
    Call the OpenAI Embeddings API for a batch of texts.

    Validates that returned dimensions match EMBEDDING_DIM.
    Falls back to zero vectors on any error.
    """
    expected_dim = get_embedding_dim()

    try:
        from openai import OpenAI

        api_key: str = getattr(settings, "LLM_API_KEY", "").strip()
        client = OpenAI(api_key=api_key)
        model: str = getattr(settings, "EMBEDDING_MODEL", "text-embedding-3-small")

        # Truncate texts that exceed the safe character limit
        safe_texts = [t[:_MAX_CHARS_PER_TEXT] if len(t) > _MAX_CHARS_PER_TEXT else t
                      for t in texts]
        # Replace empty strings — API rejects them
        safe_texts = [t if t.strip() else "empty" for t in safe_texts]

        response = client.embeddings.create(model=model, input=safe_texts)

        # Sort by index to preserve input order
        vectors: list[Any] = sorted(response.data, key=lambda d: d.index)
        result = [item.embedding for item in vectors]

        # Dimension validation
        if result and len(result[0]) != expected_dim:
            logger.error(
                "Embedding dimension mismatch: expected %d, got %d for model '%s'. "
                "Update EMBEDDING_DIM in settings.",
                expected_dim, len(result[0]), model,
            )
            return [_zero_vector() for _ in texts]

        logger.info(
            "Embedded %d text(s) using model '%s' (dim=%d)",
            len(texts), model, expected_dim,
        )
        return result

    except Exception as exc:
        logger.error("Embedding API call failed: %s", exc, exc_info=True)
        return [_zero_vector() for _ in texts]
