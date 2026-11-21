from django.contrib import admin

from .models import Document, ExtractedContent, AIAnalysis, DocumentChunk


# ─── Inlines ──────────────────────────────────────────────────────────────────

class ExtractedContentInline(admin.StackedInline):
    model = ExtractedContent
    extra = 0
    readonly_fields = ["text", "page_count", "extraction_method", "created_at", "updated_at"]
    can_delete = False


class AIAnalysisInline(admin.StackedInline):
    model = AIAnalysis
    extra = 0
    readonly_fields = [
        "ai_status", "document_type", "confidence",
        "extracted_data", "summary", "model_name",
        "error_message", "created_at", "updated_at",
    ]
    can_delete = False


class DocumentChunkInline(admin.TabularInline):
    """Chunk summary inside the Document admin page."""
    model = DocumentChunk
    extra = 0
    fields = ["chunk_index", "page_number", "char_count", "has_embedding"]
    readonly_fields = ["chunk_index", "page_number", "char_count", "has_embedding"]
    can_delete = False
    max_num = 20
    show_change_link = True

    @admin.display(description="Embedded?", boolean=True)
    def has_embedding(self, obj):
        return bool(obj.embedding)


# ─── Document ─────────────────────────────────────────────────────────────────

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = [
        "id", "title", "document_type", "status",
        "ai_status_display", "chunk_count", "uploaded_by", "created_at",
    ]
    list_filter = ["status", "document_type"]
    search_fields = ["title", "uploaded_by__username"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]
    inlines = [ExtractedContentInline, AIAnalysisInline, DocumentChunkInline]

    @admin.display(description="AI Status")
    def ai_status_display(self, obj):
        try:
            return obj.ai_analysis.ai_status
        except AIAnalysis.DoesNotExist:
            return "—"

    @admin.display(description="Chunks")
    def chunk_count(self, obj):
        return obj.chunks.count()


# ─── ExtractedContent ─────────────────────────────────────────────────────────

@admin.register(ExtractedContent)
class ExtractedContentAdmin(admin.ModelAdmin):
    list_display = ["id", "document", "extraction_method", "page_count", "char_count", "created_at"]
    list_filter = ["extraction_method"]
    readonly_fields = ["text", "page_count", "extraction_method", "created_at", "updated_at"]
    search_fields = ["document__title"]
    ordering = ["-created_at"]

    @admin.display(description="Characters")
    def char_count(self, obj):
        return f"{len(obj.text):,}"


# ─── AIAnalysis ───────────────────────────────────────────────────────────────

@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    list_display = [
        "id", "document", "document_type",
        "ai_status", "confidence_display", "model_name", "created_at",
    ]
    list_filter = ["ai_status", "document_type"]
    search_fields = ["document__title"]
    readonly_fields = [
        "document_type", "confidence", "extracted_data",
        "summary", "model_name", "error_message",
        "created_at", "updated_at",
    ]
    ordering = ["-created_at"]

    @admin.display(description="Confidence")
    def confidence_display(self, obj):
        return f"{obj.confidence_percent}%"


# ─── DocumentChunk ────────────────────────────────────────────────────────────

@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    """Admin panel for DocumentChunk — the RAG building block."""

    list_display = [
        "id", "document", "chunk_index",
        "page_number", "char_count", "has_embedding", "created_at",
    ]
    list_filter = ["document__document_type"]
    search_fields = ["document__title", "content"]
    readonly_fields = [
        "document", "chunk_index", "page_number",
        "char_count", "content", "created_at",
    ]
    ordering = ["document", "chunk_index"]

    @admin.display(description="Embedded?", boolean=True)
    def has_embedding(self, obj):
        return bool(obj.embedding)
