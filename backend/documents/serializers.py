import mimetypes
import os

from rest_framework import serializers

from .models import Document, ExtractedContent, AIAnalysis

# ─── File validation constants ────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
}

MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


# ─── ExtractedContent ─────────────────────────────────────────────────────────

class ExtractedContentSerializer(serializers.ModelSerializer):
    """
    Serializer for ExtractedContent.
    Includes extraction_method (PDF_TEXT / DOCX_TEXT / OCR).
    """

    class Meta:
        model = ExtractedContent
        fields = [
            "text",
            "page_count",
            "extraction_method",
            "created_at",
            "updated_at",
        ]


# ─── AIAnalysis ───────────────────────────────────────────────────────────────

class AIAnalysisSerializer(serializers.ModelSerializer):
    confidence_percent = serializers.SerializerMethodField()

    class Meta:
        model = AIAnalysis
        fields = [
            "ai_status",
            "document_type",
            "confidence",
            "confidence_percent",
            "extracted_data",
            "summary",
            "model_name",
            "error_message",
            "created_at",
            "updated_at",
        ]

    def get_confidence_percent(self, obj) -> int:
        return obj.confidence_percent


# ─── Document (full detail) ───────────────────────────────────────────────────

class DocumentSerializer(serializers.ModelSerializer):
    """
    Full document serializer with nested extracted_content and ai_analysis.
    Used for GET /api/documents/{id}/ and POST /api/documents/upload/
    """

    extracted_content = ExtractedContentSerializer(read_only=True)
    ai_analysis = AIAnalysisSerializer(read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "file",
            "document_type",
            "status",
            "uploaded_by",
            "extracted_content",
            "ai_analysis",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "uploaded_by",
            "status",
            "document_type",
            "extracted_content",
            "ai_analysis",
            "created_at",
            "updated_at",
        ]

    def validate_file(self, value):
        """
        Validate uploaded file:
            1. Extension must be in ALLOWED_EXTENSIONS
            2. MIME type must be in ALLOWED_MIME_TYPES
            3. File size must not exceed MAX_FILE_SIZE_MB
        """
        # 1. Extension check
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"File type '{ext}' is not supported. "
                f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        # 2. MIME type check
        mime_type, _ = mimetypes.guess_type(value.name)
        if mime_type not in ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                f"MIME type '{mime_type}' is not allowed. "
                f"Allowed: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
            )

        # 3. Size check
        if value.size > MAX_FILE_SIZE_BYTES:
            size_mb = value.size / (1024 * 1024)
            raise serializers.ValidationError(
                f"File size {size_mb:.1f} MB exceeds the {MAX_FILE_SIZE_MB} MB limit."
            )

        return value


# ─── Document (list — lightweight) ───────────────────────────────────────────

class DocumentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views — omits large text fields.
    Includes extraction_method and page_count summary for the document list.
    """

    ai_status = serializers.SerializerMethodField()
    confidence_percent = serializers.SerializerMethodField()
    extraction_method = serializers.SerializerMethodField()
    page_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "document_type",
            "status",
            "ai_status",
            "confidence_percent",
            "extraction_method",
            "page_count",
            "uploaded_by",
            "created_at",
            "updated_at",
        ]

    def get_ai_status(self, obj) -> str | None:
        try:
            return obj.ai_analysis.ai_status
        except AIAnalysis.DoesNotExist:
            return None

    def get_confidence_percent(self, obj) -> int | None:
        try:
            return obj.ai_analysis.confidence_percent
        except AIAnalysis.DoesNotExist:
            return None

    def get_extraction_method(self, obj) -> str | None:
        try:
            return obj.extracted_content.extraction_method
        except ExtractedContent.DoesNotExist:
            return None

    def get_page_count(self, obj) -> int | None:
        try:
            return obj.extracted_content.page_count
        except ExtractedContent.DoesNotExist:
            return None


# ─── ExtractedContent detail ──────────────────────────────────────────────────

class ExtractedContentDetailSerializer(serializers.ModelSerializer):
    """
    Used by GET /api/documents/{id}/content/
    Returns full text + metadata.
    """

    class Meta:
        model = ExtractedContent
        fields = [
            "text",
            "page_count",
            "extraction_method",
            "created_at",
            "updated_at",
        ]


# ─── DocumentDeepAnalysis ──────────────────────────────────────────────────────

class DocumentDeepAnalysisSerializer(serializers.ModelSerializer):
    """
    Full deep analysis result.
    GET /api/documents/{id}/deep_analysis/
    """
    risk_count   = serializers.ReadOnlyField()
    has_issues   = serializers.ReadOnlyField()

    class Meta:
        from .models import DocumentDeepAnalysis
        model  = DocumentDeepAnalysis
        fields = [
            "id", "status", "summary",
            "key_information", "important_dates", "entities", "amounts",
            "missing_information", "inconsistencies", "risks",
            "overall_risk_level", "confidence_score",
            "risk_count", "has_issues",
            "error_message", "created_at", "updated_at",
        ]
        read_only_fields = fields


# ─── Comparison serializers ────────────────────────────────────────────────────

class ComparisonResultSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import ComparisonResult
        model  = ComparisonResult
        fields = [
            "id", "field_name", "document_values", "status",
            "severity", "explanation", "page_references", "mismatch_type",
        ]
        read_only_fields = fields


class ComparisonDocumentSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source="document.title", read_only=True)
    document_type  = serializers.CharField(source="document.document_type", read_only=True)

    class Meta:
        from .models import ComparisonDocument
        model  = ComparisonDocument
        fields = ["id", "document", "document_title", "document_type", "role_label"]
        read_only_fields = ["document_title", "document_type"]


class DocumentComparisonSerializer(serializers.ModelSerializer):
    """Full comparison detail with all results."""
    results             = ComparisonResultSerializer(many=True, read_only=True)
    comparison_documents = ComparisonDocumentSerializer(many=True, read_only=True)
    match_count    = serializers.SerializerMethodField()
    mismatch_count = serializers.SerializerMethodField()

    class Meta:
        from .models import DocumentComparison
        model  = DocumentComparison
        fields = [
            "id", "title", "status", "overall_status", "summary",
            "comparison_documents", "results",
            "match_count", "mismatch_count",
            "error_message", "created_at", "updated_at", "completed_at",
        ]
        read_only_fields = fields

    def get_match_count(self, obj) -> int:
        return obj.results.filter(status="MATCH").count()

    def get_mismatch_count(self, obj) -> int:
        return obj.results.filter(status__in=["MISMATCH", "MISSING"]).count()


class DocumentComparisonListSerializer(serializers.ModelSerializer):
    """Lightweight comparison list — no results."""
    doc_count      = serializers.SerializerMethodField()
    mismatch_count = serializers.SerializerMethodField()

    class Meta:
        from .models import DocumentComparison
        model  = DocumentComparison
        fields = [
            "id", "title", "status", "overall_status",
            "doc_count", "mismatch_count",
            "created_at", "completed_at",
        ]

    def get_doc_count(self, obj) -> int:
        return obj.comparison_documents.count()

    def get_mismatch_count(self, obj) -> int:
        return obj.results.filter(status__in=["MISMATCH", "MISSING"]).count()


class ComparisonCreateSerializer(serializers.Serializer):
    """Input for POST /api/comparisons/"""
    document_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=2,
        max_length=10,
    )
    title = serializers.CharField(max_length=255, required=False, default="Document Comparison")
