"""
Document views for DocuMind AI — Day 6.

Security model:
    - All routes require JWT authentication.
    - get_queryset() scopes results to documents the user is authorized to see:
          ADMIN    → all documents
          MANAGER  → own documents + documents where can_view permission exists
          EMPLOYEE → own documents + documents where can_view permission exists
    - get_object() additionally runs check_object_permissions() for object-level
      access control via DocumentAccessPermission.
    - Audit events are created for UPLOAD, VIEW, DELETE.
"""

import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from audit.models import AuditLog
from audit.utils import log_action
from workflows.models import DocumentPermission
from workflows.permissions import DocumentAccessPermission

from .models import Document, AIAnalysis, ExtractedContent
from .serializers import (
    DocumentSerializer,
    DocumentListSerializer,
    AIAnalysisSerializer,
    ExtractedContentDetailSerializer,
)
from .tasks import process_document

logger = logging.getLogger(__name__)


class DocumentViewSet(viewsets.ModelViewSet):
    """
    CRUD API for documents — with Day 6 RBAC and document-level permissions.

    Standard endpoints (via DefaultRouter):
        GET    /api/documents/                   → list (authorized only)
        POST   /api/documents/                   → create
        GET    /api/documents/{id}/              → retrieve (access-checked)
        PUT    /api/documents/{id}/              → full update (owner/admin)
        PATCH  /api/documents/{id}/              → partial update (owner/admin)
        DELETE /api/documents/{id}/              → delete (owner/admin)

    Custom actions:
        POST   /api/documents/upload/            → upload document
        GET    /api/documents/{id}/content/      → extracted text content
        GET    /api/documents/{id}/analysis/     → AI analysis result
    """

    permission_classes = [IsAuthenticated, DocumentAccessPermission]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == "list":
            return DocumentListSerializer
        return DocumentSerializer

    def get_queryset(self):
        """
        Return documents the current user is authorized to see.

        ADMIN   → all documents
        Others  → own documents UNION documents with an explicit permission row
        """
        user = self.request.user

        if getattr(user, "role", None) == "ADMIN":
            return Document.objects.all().order_by("-created_at")

        # Documents the user owns
        owned = Document.objects.filter(uploaded_by=user)

        # Documents shared with this user directly or via role
        user_role = getattr(user, "role", "")
        shared_ids = DocumentPermission.objects.filter(
            can_view=True,
        ).filter(
            # user-level OR role-level
            user=user
        ).values_list("document_id", flat=True)

        role_shared_ids = DocumentPermission.objects.filter(
            can_view=True,
            role=user_role,
        ).values_list("document_id", flat=True) if user_role else []

        shared = Document.objects.filter(
            id__in=list(shared_ids) + list(role_shared_ids)
        )

        # Union (distinct)
        return (owned | shared).distinct().order_by("-created_at")

    def get_permissions(self):
        """
        Override per-action:
            list, create, upload → IsAuthenticated only (queryset scoping handles access)
            retrieve, update, destroy, content, analysis → + DocumentAccessPermission
        """
        if self.action in ("list", "create", "upload"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), DocumentAccessPermission()]

    def perform_create(self, serializer):
        document = serializer.save(uploaded_by=self.request.user)
        process_document.delay(document.id)

        log_action(
            user=self.request.user,
            action=AuditLog.DOCUMENT_UPLOADED,
            document=document,
            description=f"'{document.title}' uploaded by {self.request.user.username}.",
            request=self.request,
        )

        logger.info(
            "Document %s uploaded by '%s' — processing task queued.",
            document.id,
            self.request.user.username,
        )

    def perform_destroy(self, instance):
        log_action(
            user=self.request.user,
            action=AuditLog.DOCUMENT_DELETED,
            document=instance,
            description=f"'{instance.title}' deleted by {self.request.user.username}.",
            request=self.request,
        )
        instance.delete()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()  # runs check_object_permissions()

        log_action(
            user=request.user,
            action=AuditLog.DOCUMENT_VIEWED,
            document=instance,
            description=f"'{instance.title}' viewed by {request.user.username}.",
            request=request,
        )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # ── POST /api/documents/upload/ ────────────────────────────────────────────

    @action(
        detail=False,
        methods=["post"],
        url_path="upload",
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsAuthenticated],
    )
    def upload(self, request):
        """
        POST /api/documents/upload/

        Upload a document and queue background processing.

        Request: multipart/form-data
            title : string
            file  : PDF / DOCX / PNG / JPG / JPEG (max 10 MB)

        Response 201:
            Full DocumentSerializer output.
        """
        serializer = DocumentSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        document = serializer.save(uploaded_by=request.user)
        process_document.delay(document.id)

        log_action(
            user=request.user,
            action=AuditLog.DOCUMENT_UPLOADED,
            document=document,
            description=f"'{document.title}' uploaded via /upload/ by {request.user.username}.",
            request=request,
        )

        logger.info(
            "Document %s uploaded via /upload/ by '%s' — processing queued.",
            document.id,
            request.user.username,
        )

        return Response(
            DocumentSerializer(document, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    # ── GET /api/documents/{id}/content/ ───────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="content")
    def content(self, request, pk=None):
        """
        GET /api/documents/{id}/content/

        Returns extracted text and metadata for a processed document.
        Requires DocumentAccessPermission (access-checked via get_object()).
        """
        document = self.get_object()

        try:
            extracted = document.extracted_content
        except ExtractedContent.DoesNotExist:
            raise NotFound(
                "Extracted content is not available yet. "
                "The document may still be processing."
            )

        serializer = ExtractedContentDetailSerializer(extracted)
        return Response(
            {
                "document_id": document.id,
                "document_title": document.title,
                **serializer.data,
            }
        )

    # ── GET /api/documents/{id}/analysis/ ──────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="analysis")
    def analysis(self, request, pk=None):
        """
        GET /api/documents/{id}/analysis/

        Returns AI classification, extracted fields, and summary.
        Requires DocumentAccessPermission (access-checked via get_object()).
        """
        document = self.get_object()

        try:
            ai = document.ai_analysis
        except AIAnalysis.DoesNotExist:
            raise NotFound(
                "AI analysis is not available yet. "
                "The document may still be processing."
            )

        serializer = AIAnalysisSerializer(ai)
        return Response(
            {
                "document_id": document.id,
                "document_title": document.title,
                **serializer.data,
            }
        )

    # ── POST /api/documents/{id}/retry/ ───────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="retry")
    def retry(self, request, pk=None):
        """
        POST /api/documents/{id}/retry/

        Re-queue a failed document for processing.
        Only works if current status is FAILED.
        Resets status to UPLOADED and dispatches process_document.
        """
        document = self.get_object()

        if document.status != "FAILED":
            return Response(
                {"detail": f"Cannot retry — document status is '{document.status}', not FAILED."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        document.status = "UPLOADED"
        document.save(update_fields=["status", "updated_at"])

        process_document.delay(document.id)

        log_action(
            user=request.user,
            action=AuditLog.DOCUMENT_UPLOADED,
            document=document,
            description=f"'{document.title}' re-queued for processing by {request.user.username}.",
            request=request,
        )

        logger.info("Document %s retry queued by '%s'.", document.id, request.user.username)

        return Response(
            {"detail": "Processing re-queued.", "document_id": document.id},
            status=status.HTTP_200_OK,
        )

    # ── POST /api/documents/{id}/reindex/ ──────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="reindex")
    def reindex(self, request, pk=None):
        """
        POST /api/documents/{id}/reindex/

        Re-queue a document's chunk_and_embed task to rebuild its search index.

        Only allowed when:
            - Document status is READY, PROCESSED, APPROVED, PENDING_APPROVAL,
              REVIEW_REQUIRED, or REJECTED  (i.e. extraction has completed).
            - Document has extracted content.

        Resets DocumentIndexStatus to PENDING and dispatches chunk_and_embed.
        Does NOT re-run OCR or AI analysis — only re-builds the vector index.

        Response 202:
            { "detail": "Re-indexing queued.", "document_id": 15 }

        Response 400:
            { "detail": "Cannot reindex — extraction has not completed." }
        """
        from .models import DocumentIndexStatus
        from .tasks import chunk_and_embed as chunk_and_embed_task

        document = self.get_object()

        REINDEXABLE_STATUSES = {
            "READY", "PROCESSED", "APPROVED",
            "PENDING_APPROVAL", "REVIEW_REQUIRED", "REJECTED",
        }

        if document.status not in REINDEXABLE_STATUSES:
            return Response(
                {
                    "detail": (
                        f"Cannot reindex — document status is '{document.status}'. "
                        "Extraction must complete before re-indexing."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            extracted = document.extracted_content
            if not extracted.text.strip():
                return Response(
                    {"detail": "Cannot reindex — extracted text is empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except ExtractedContent.DoesNotExist:
            return Response(
                {"detail": "Cannot reindex — no extracted content found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reset index status so the task re-builds from scratch
        idx_status, _ = DocumentIndexStatus.objects.get_or_create(document=document)
        idx_status.status = DocumentIndexStatus.INDEX_PENDING
        idx_status.error_message = ""
        idx_status.save(update_fields=["status", "error_message", "updated_at"])

        chunk_and_embed_task.delay(document.id)

        logger.info(
            "Document %s re-index queued by '%s'.",
            document.id, request.user.username,
        )

        return Response(
            {"detail": "Re-indexing queued.", "document_id": document.id},
            status=status.HTTP_202_ACCEPTED,
        )

    # ── GET /api/documents/{id}/index_status/ ──────────────────────────────────

    @action(detail=True, methods=["get"], url_path="index_status")
    def index_status(self, request, pk=None):
        """
        GET /api/documents/{id}/index_status/

        Returns the current semantic-search indexing status for a document.

        Response:
            {
                "document_id": 15,
                "status": "READY",
                "chunk_count": 42,
                "indexed_at": "2026-10-25T10:00:00Z",
                "error_message": ""
            }
        """
        from .models import DocumentIndexStatus

        document = self.get_object()

        try:
            idx = document.index_status
            return Response({
                "document_id":   document.id,
                "status":        idx.status,
                "chunk_count":   idx.chunk_count,
                "indexed_at":    idx.indexed_at,
                "error_message": idx.error_message,
            })
        except DocumentIndexStatus.DoesNotExist:
            return Response({
                "document_id":   document.id,
                "status":        "PENDING",
                "chunk_count":   0,
                "indexed_at":    None,
                "error_message": "",
            })

    # ── GET /api/documents/{id}/deep_analysis/ ──────────────────────────────────

    @action(detail=True, methods=["get"], url_path="deep_analysis")
    def deep_analysis(self, request, pk=None):
        """
        GET /api/documents/{id}/deep_analysis/

        Returns the comprehensive AI deep analysis:
        summary, key info, dates, amounts, entities, missing info,
        inconsistencies, risks, overall risk level, confidence score.
        """
        document = self.get_object()

        from .models import DocumentDeepAnalysis
        from .serializers import DocumentDeepAnalysisSerializer

        try:
            deep = document.deep_analysis
        except DocumentDeepAnalysis.DoesNotExist:
            raise NotFound(
                "Deep analysis is not available yet. "
                "The document may still be processing or analysis has not run."
            )

        serializer = DocumentDeepAnalysisSerializer(deep)
        return Response({
            "document_id":    document.id,
            "document_title": document.title,
            **serializer.data,
        })


# ─── ComparisonViewSet ─────────────────────────────────────────────────────────

from rest_framework import mixins
from rest_framework.viewsets import GenericViewSet


class ComparisonViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    GenericViewSet,
):
    """
    Cross-document comparison API.

    POST   /api/comparisons/              → create + immediately queue comparison
    GET    /api/comparisons/              → list user's comparisons
    GET    /api/comparisons/{id}/         → full comparison with results
    DELETE /api/comparisons/{id}/         → delete comparison
    POST   /api/comparisons/{id}/run/     → re-run comparison
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import (
            ComparisonCreateSerializer,
            DocumentComparisonSerializer,
            DocumentComparisonListSerializer,
        )
        if self.action == "create":
            return ComparisonCreateSerializer
        if self.action == "list":
            return DocumentComparisonListSerializer
        return DocumentComparisonSerializer

    def get_queryset(self):
        from .models import DocumentComparison
        user = self.request.user
        if getattr(user, "role", None) == "ADMIN":
            return DocumentComparison.objects.prefetch_related(
                "comparison_documents__document", "results"
            ).all()
        return DocumentComparison.objects.filter(
            created_by=user
        ).prefetch_related("comparison_documents__document", "results")

    def create(self, request, *args, **kwargs):
        from .serializers import ComparisonCreateSerializer, DocumentComparisonSerializer
        from .models import (
            DocumentComparison, ComparisonDocument, Document as DocModel
        )
        from django.db.models import Q
        from workflows.models import DocumentPermission
        from .tasks import run_comparison_task

        ser = ComparisonCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        doc_ids = ser.validated_data["document_ids"]
        title   = ser.validated_data.get("title", "Document Comparison")
        user    = request.user
        role    = getattr(user, "role", "")

        # Permission-check every document
        if role == "ADMIN":
            accessible_ids = set(
                DocModel.objects.filter(id__in=doc_ids).values_list("id", flat=True)
            )
        else:
            shared_ids = DocumentPermission.objects.filter(
                can_view=True
            ).filter(Q(user=user) | Q(role=role)).values_list("document_id", flat=True)

            accessible_ids = set(
                DocModel.objects.filter(id__in=doc_ids).filter(
                    Q(uploaded_by=user) | Q(id__in=shared_ids)
                ).values_list("id", flat=True)
            )

        blocked = set(doc_ids) - accessible_ids
        if blocked:
            return Response(
                {"error": f"No permission for document IDs: {sorted(blocked)}"},
                status=status.HTTP_403_FORBIDDEN,
            )

        comparison = DocumentComparison.objects.create(
            created_by=user,
            title=title,
            status="PENDING",
        )

        for doc_id in doc_ids:
            doc = DocModel.objects.get(id=doc_id)
            ComparisonDocument.objects.create(
                comparison=comparison,
                document=doc,
                role_label=doc.document_type or "",
            )

        # Queue comparison task immediately
        run_comparison_task.delay(comparison.id)

        return Response(
            DocumentComparisonSerializer(comparison).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="run")
    def run(self, request, pk=None):
        """POST /api/comparisons/{id}/run/ — re-run an existing comparison."""
        from .models import DocumentComparison
        from .tasks import run_comparison_task

        try:
            comparison = DocumentComparison.objects.get(
                pk=pk, created_by=request.user
            )
        except DocumentComparison.DoesNotExist:
            raise NotFound("Comparison not found.")

        comparison.status = "PENDING"
        comparison.overall_status = ""
        comparison.summary = ""
        comparison.error_message = ""
        comparison.save(update_fields=["status", "overall_status", "summary",
                                        "error_message", "updated_at"])

        run_comparison_task.delay(comparison.id)

        return Response({"detail": "Comparison re-queued.", "id": comparison.id})
