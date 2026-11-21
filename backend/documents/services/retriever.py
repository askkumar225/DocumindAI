"""
Semantic search / RAG retrieval service.

Given a user query this module:
    1. Embeds the query into a vector.
    2. Fetches the authenticated user's authorized DocumentChunks.
    3. When document_id is supplied, verifies the user may access that document
       before restricting the search — unauthorized IDs raise PermissionError.
    4. Ranks chunks by cosine similarity (numpy dev, pgvector prod).
    5. Returns Top-K results with document metadata and similarity scores.

Authorization model (matches DocumentViewSet.get_queryset):
    ADMIN role       → all documents
    Document owner   → own documents
    DocumentPermission with can_view=True, user=user OR role=user.role
"""

import logging
from dataclasses import dataclass

import numpy as np
from django.conf import settings
from django.db.models import Q

from ..models import Document, DocumentChunk
from .embeddings import embed_text

logger = logging.getLogger(__name__)

# Minimum cosine similarity to be included in results.
# Keeps near-zero (irrelevant) chunks out of responses without hiding
# legitimately relevant passages. 0.20 is conservative and appropriate
# for text-embedding-3-small without validated domain testing.
_MIN_SIMILARITY = 0.20


# ─── Result dataclass ─────────────────────────────────────────────────────────

@dataclass
class SearchResult:
    chunk_id:       int
    document_id:    int
    document_title: str
    document_type:  str
    chunk_index:    int
    page_number:    int | None
    content:        str
    similarity:     float


# ─── Authorization helper ─────────────────────────────────────────────────────

def _authorized_document_ids(user) -> "set[int] | None":
    """
    Return the set of document IDs the user may access, or None for ADMIN
    (meaning: unrestricted).

    Uses the same logic as DocumentViewSet.get_queryset.
    """
    user_role = getattr(user, "role", "")
    if user_role == "ADMIN":
        return None   # unrestricted

    from workflows.models import DocumentPermission  # deferred import

    shared_ids = set(
        DocumentPermission.objects.filter(
            can_view=True
        ).filter(
            Q(user=user) | Q(role=user_role)
        ).values_list("document_id", flat=True)
    )

    owned_ids = set(
        Document.objects.filter(uploaded_by=user).values_list("id", flat=True)
    )

    return owned_ids | shared_ids


# ─── Cosine similarity (numpy) ────────────────────────────────────────────────

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))


# ─── Public search entry point ────────────────────────────────────────────────

def semantic_search(
    query: str,
    user,
    top_k: int | None = None,
    document_id: int | None = None,
) -> list[SearchResult]:
    """
    Find the Top-K most semantically similar chunks to a user query.

    Args:
        query:       Natural-language question from the user.
        user:        Authenticated Django user — used for permission scoping.
        top_k:       Number of results (default: SEARCH_TOP_K setting).
        document_id: Restrict search to one document. The user must have
                     access to that document; raises PermissionError otherwise.

    Returns:
        List of SearchResult sorted by descending similarity.

    Raises:
        PermissionError: document_id supplied but user cannot access it.
        ValueError:      Empty query supplied.
    """
    if not query.strip():
        raise ValueError("Search query must not be empty.")

    k: int = top_k or getattr(settings, "SEARCH_TOP_K", 5)

    # ── Step 1: resolve authorized IDs ────────────────────────────────────────
    auth_ids = _authorized_document_ids(user)   # None = admin (unrestricted)

    # ── Step 2: validate document_id filter ───────────────────────────────────
    if document_id is not None:
        if auth_ids is not None and document_id not in auth_ids:
            raise PermissionError(
                f"User '{user.username}' does not have access to document {document_id}."
            )

    # ── Step 3: embed query ───────────────────────────────────────────────────
    query_vector = embed_text(query)

    if all(v == 0.0 for v in query_vector):
        logger.warning(
            "Query embedding is all zeros — LLM_API_KEY may not be set or "
            "is a placeholder. Returning empty search results."
        )
        return []

    # ── Step 4: build authorized queryset ─────────────────────────────────────
    if auth_ids is None:
        qs = DocumentChunk.objects.select_related("document")
    else:
        qs = DocumentChunk.objects.filter(
            document_id__in=auth_ids
        ).select_related("document")

    if document_id is not None:
        qs = qs.filter(document_id=document_id)

    # Exclude chunks that have no embedding (zero-vector or missing)
    qs = qs.exclude(embedding=[])

    use_pgvector: bool = getattr(settings, "USE_PGVECTOR", False)

    if use_pgvector:
        return _pgvector_search(qs, query_vector, k)
    return _numpy_search(qs, query_vector, k)


# ─── Backend 1: numpy (SQLite / dev) ─────────────────────────────────────────

def _numpy_search(qs, query_vector: list[float], k: int) -> list[SearchResult]:
    """
    Cosine similarity computed in Python via numpy.
    Suitable for development (hundreds of chunks); not for production scale.
    """
    chunks = list(qs)
    if not chunks:
        return []

    scored: list[tuple[float, DocumentChunk]] = []
    for chunk in chunks:
        if not chunk.embedding:
            continue
        sim = _cosine_similarity(query_vector, chunk.embedding)
        scored.append((sim, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:k]

    results = []
    for sim, chunk in top:
        if sim < _MIN_SIMILARITY:
            continue
        results.append(SearchResult(
            chunk_id=chunk.id,
            document_id=chunk.document_id,
            document_title=chunk.document.title,
            document_type=chunk.document.document_type,
            chunk_index=chunk.chunk_index,
            page_number=chunk.page_number,
            content=chunk.content,
            similarity=round(sim, 4),
        ))

    logger.info(
        "numpy search: scanned %d chunks, returning %d results (threshold=%.2f)",
        len(chunks), len(results), _MIN_SIMILARITY,
    )
    return results


# ─── Backend 2: pgvector (PostgreSQL) ────────────────────────────────────────

def _pgvector_search(qs, query_vector: list[float], k: int) -> list[SearchResult]:
    """
    Uses pgvector's cosine distance operator <=> for efficient ANN search.
    Falls back to numpy if pgvector is not actually available.
    """
    try:
        from pgvector.django import CosineDistance  # type: ignore

        qs = qs.annotate(
            distance=CosineDistance("embedding", query_vector)
        ).order_by("distance")[:k]

        results = []
        for chunk in qs:
            similarity = round(1.0 - float(chunk.distance), 4)
            if similarity < _MIN_SIMILARITY:
                continue
            results.append(SearchResult(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                document_title=chunk.document.title,
                document_type=chunk.document.document_type,
                chunk_index=chunk.chunk_index,
                page_number=chunk.page_number,
                content=chunk.content,
                similarity=similarity,
            ))

        logger.info("pgvector search returned %d results", len(results))
        return results

    except Exception as exc:
        logger.warning("pgvector search failed (%s) — falling back to numpy.", exc)
        return _numpy_search(qs, query_vector, k)
