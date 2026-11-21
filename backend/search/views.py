import logging

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializers import SearchQuerySerializer, SearchResponseSerializer
from documents.services.retriever import semantic_search

logger = logging.getLogger(__name__)


class SemanticSearchView(APIView):
    """
    POST /api/search/

    Perform semantic (vector) search over the authenticated user's documents.

    Request:
        {
            "query": "When do I need to pay?",
            "document_id": 25,   // optional — restrict to one document
            "top_k": 5           // optional — default from SEARCH_TOP_K setting
        }

    Response:
        {
            "query": "When do I need to pay?",
            "total_results": 3,
            "results": [ { chunk_id, document_id, document_title, ... } ]
        }

    Authorization:
        Only the authenticated user's authorized documents are searched.
        Permission filtering is applied BEFORE vector retrieval — unauthorized
        document content is never fetched or returned.

    Error cases handled:
        400 — missing/empty query, invalid top_k
        401 — unauthenticated request
        403 — document_id supplied but user lacks access
        429 — embedding provider rate limit
        500 — unexpected retrieval failure
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # ── Validate input ────────────────────────────────────────────────────
        input_serializer = SearchQuerySerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        query:       str      = data["query"]
        document_id: int | None = data.get("document_id")
        top_k:       int | None = data.get("top_k")

        logger.info(
            "Semantic search — user=%s query='%s' doc_id=%s top_k=%s",
            request.user.username, query[:80], document_id, top_k,
        )

        # ── Run semantic search ───────────────────────────────────────────────
        try:
            results = semantic_search(
                query=query,
                user=request.user,
                top_k=top_k,
                document_id=document_id,
            )

        except PermissionError as exc:
            logger.warning("Search permission denied: %s", exc)
            return Response(
                {"error": "You do not have permission to search that document."},
                status=status.HTTP_403_FORBIDDEN,
            )

        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as exc:
            err_msg = str(exc).lower()
            # Rate limit from embedding provider
            if "429" in err_msg or "rate limit" in err_msg:
                return Response(
                    {"error": "The search service is temporarily busy. Please try again shortly."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            logger.error("Semantic search error: %s", exc, exc_info=True)
            return Response(
                {"error": "Search failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ── Serialize and return ──────────────────────────────────────────────
        result_dicts = [
            {
                "chunk_id":       r.chunk_id,
                "document_id":    r.document_id,
                "document_title": r.document_title,
                "document_type":  r.document_type,
                "chunk_index":    r.chunk_index,
                "page_number":    r.page_number,
                "content":        r.content,
                "similarity":     r.similarity,
            }
            for r in results
        ]

        response_data = {
            "query":         query,
            "total_results": len(result_dicts),
            "results":       result_dicts,
        }

        serializer = SearchResponseSerializer(response_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
