from django.conf import settings
from django.db import models


class Document(models.Model):
    """
    Core document model for DocuMind AI.

    Tracks every file uploaded by a user, its processing status,
    and its detected document type.

    Flow:
        UPLOADED → PROCESSING → PROCESSED
                              ↘ FAILED
    """

    STATUS_CHOICES = [
        ("UPLOADED",         "Uploaded"),
        ("PROCESSING",       "Processing"),
        ("ANALYZING",        "Analyzing"),       # AI analysis in progress
        ("EMBEDDING",        "Embedding"),       # Chunking + embeddings in progress
        ("PROCESSED",        "Processed"),       # Legacy — kept for compatibility
        ("READY",            "Ready"),           # Fully processed, ready for chat/search
        ("FAILED",           "Failed"),
        # Day 6 — Workflow statuses
        ("REVIEW_REQUIRED",  "Review Required"),
        ("PENDING_APPROVAL", "Pending Approval"),
        ("APPROVED",         "Approved"),
        ("REJECTED",         "Rejected"),
        ("NEEDS_CHANGES",    "Needs Changes"),
        ("ARCHIVED",         "Archived"),        # Soft-archived, hidden from default lists
    ]

    DOCUMENT_TYPES = [
        ("UNKNOWN", "Unknown"),
        ("INVOICE", "Invoice"),
        ("CONTRACT", "Contract"),
        ("PURCHASE_ORDER", "Purchase Order"),
        ("RECEIPT", "Receipt"),
        ("REPORT", "Report"),
        ("POLICY", "Policy"),
        ("OTHER", "Other"),
    ]

    title = models.CharField(max_length=255)

    file = models.FileField(
        upload_to="documents/"
    )

    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPES,
        default="UNKNOWN",
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="UPLOADED",
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ExtractedContent(models.Model):
    """
    Stores text extracted from a processed document.

    Relationship:
        Document ──(OneToOne)──► ExtractedContent

    The text field holds the full raw extraction result from:
        - PyMuPDF  (digital PDFs)
        - python-docx (DOCX files)
        - Tesseract OCR (scanned PDFs / images)

    This content will later be chunked, embedded, and used for
    RAG, semantic search, summarisation, and AI classification.
    """

    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name="extracted_content",
    )

    EXTRACTION_METHOD_CHOICES = [
        ("PDF_TEXT", "PDF Text"),
        ("DOCX_TEXT", "DOCX Text"),
        ("OCR", "OCR"),
        ("UNKNOWN", "Unknown"),
    ]

    text = models.TextField()

    page_count = models.IntegerField(default=0)

    extraction_method = models.CharField(
        max_length=20,
        choices=EXTRACTION_METHOD_CHOICES,
        default="UNKNOWN",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Extracted content — {self.document.title}"


class AIAnalysis(models.Model):
    """
    Stores the AI-generated understanding of a processed document.

    Relationship:
        Document ──(OneToOne)──► AIAnalysis

    Fields:
        document_type  : AI-classified type (INVOICE, CONTRACT, etc.)
        confidence     : Confidence score 0.0 – 1.0 returned by the LLM
        extracted_data : JSONField — flexible structured fields per document type
        summary        : Short AI-generated plain-language summary
        model_name     : Which LLM model produced this result (for auditability)

    extracted_data examples:
        INVOICE  → {"invoice_number": "INV-10245", "total_amount": 84500, ...}
        CONTRACT → {"parties": [...], "duration": "3 years", ...}
        PO       → {"po_number": "PO-2026-1005", "delivery_date": "...", ...}
    """

    AI_STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name="ai_analysis",
    )

    ai_status = models.CharField(
        max_length=20,
        choices=AI_STATUS_CHOICES,
        default="PENDING",
    )

    document_type = models.CharField(
        max_length=50,
        blank=True,
    )

    confidence = models.FloatField(default=0.0)

    extracted_data = models.JSONField(default=dict)

    summary = models.TextField(blank=True)

    model_name = models.CharField(max_length=100, blank=True)

    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"AI Analysis — {self.document.title} ({self.document_type})"

    @property
    def confidence_percent(self) -> int:
        """Return confidence as integer percentage, e.g. 96."""
        return round(self.confidence * 100)


class DocumentChunk(models.Model):
    """
    A single chunk of text extracted from a document.

    Relationship:
        Document ──(ForeignKey)──► DocumentChunk (many chunks per document)

    Why chunk?
        Large documents are split into smaller, overlapping pieces so that
        semantic search can pinpoint the most relevant passage rather than
        retrieving the entire document.

    Embedding storage strategy:
        - PostgreSQL (production): pgvector VectorField for fast ANN search
        - SQLite (development): JSONField storing a plain Python list of floats,
          with cosine similarity computed in Python via numpy

    The correct field is selected at the model level using USE_PGVECTOR setting.
    Both approaches expose the same API to the rest of the codebase.
    """

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="chunks",
    )

    # ── Text content ──────────────────────────────────────────────────────────

    content = models.TextField()

    chunk_index = models.IntegerField(
        help_text="Zero-based position of this chunk within the document."
    )

    page_number = models.IntegerField(
        null=True,
        blank=True,
        help_text="Best-guess page number (from PDF extraction). Null for DOCX.",
    )

    # ── Embedding (dual-mode) ─────────────────────────────────────────────────
    # Stored as JSONField (list of floats) in both dev and prod.
    # pgvector similarity queries are performed via the retriever service,
    # which converts to numpy in dev and uses pgvector operators in prod.

    embedding = models.JSONField(
        default=list,
        help_text="Vector embedding as a list of floats (dim from EMBEDDING_DIM setting).",
    )

    # ── Metadata ──────────────────────────────────────────────────────────────

    char_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["document", "chunk_index"]
        indexes = [
            models.Index(fields=["document", "chunk_index"]),
        ]

    def __str__(self):
        return f"Chunk {self.chunk_index} — {self.document.title}"


# ─── DocumentDeepAnalysis ──────────────────────────────────────────────────────

class DocumentDeepAnalysis(models.Model):
    """
    Comprehensive AI analysis of a single document.

    Automatically created after chunk_and_embed completes.
    Stores every AI-detected insight: dates, amounts, entities,
    missing info, inconsistencies, risks, and overall risk level.

    All list fields are stored as JSONField arrays of dicts.
    """

    RISK_CHOICES = [
        ("LOW",      "Low"),
        ("MEDIUM",   "Medium"),
        ("HIGH",     "High"),
        ("CRITICAL", "Critical"),
    ]

    STATUS_CHOICES = [
        ("PENDING",    "Pending"),
        ("PROCESSING", "Processing"),
        ("COMPLETED",  "Completed"),
        ("FAILED",     "Failed"),
    ]

    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name="deep_analysis",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
    )

    # Core narrative
    summary = models.TextField(blank=True)

    # Structured findings — arrays of dicts
    key_information     = models.JSONField(default=list)
    important_dates     = models.JSONField(default=list)
    entities            = models.JSONField(default=list)
    amounts             = models.JSONField(default=list)
    missing_information = models.JSONField(default=list)
    inconsistencies     = models.JSONField(default=list)
    risks               = models.JSONField(default=list)

    overall_risk_level = models.CharField(
        max_length=20,
        choices=RISK_CHOICES,
        default="LOW",
    )

    confidence_score = models.FloatField(default=0.0)

    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Document Deep Analysis"

    def __str__(self):
        return f"Deep Analysis — {self.document.title} [{self.status}]"

    @property
    def risk_count(self) -> int:
        return len(self.risks or [])

    @property
    def has_issues(self) -> bool:
        return bool(
            self.risks or self.inconsistencies or self.missing_information
        )


# ─── DocumentComparison ────────────────────────────────────────────────────────

class DocumentIndexStatus(models.Model):
    """
    Tracks the semantic-search indexing lifecycle for a document.

    One record per document. Created/updated by chunk_and_embed task.

    States:
        PENDING    — not yet indexed (or stale after re-upload)
        PROCESSING — chunk_and_embed task is running
        READY      — chunks + embeddings saved, document is searchable
        FAILED     — indexing failed; error_message describes why

    content_hash is an md5 of the extracted text at the time of indexing.
    When the document is reprocessed, the new hash differs and the record
    is reset to PENDING so stale vectors are never served as current.
    """

    INDEX_PENDING    = "PENDING"
    INDEX_PROCESSING = "PROCESSING"
    INDEX_READY      = "READY"
    INDEX_FAILED     = "FAILED"

    INDEX_STATUS_CHOICES = [
        (INDEX_PENDING,    "Pending"),
        (INDEX_PROCESSING, "Processing"),
        (INDEX_READY,      "Ready"),
        (INDEX_FAILED,     "Failed"),
    ]

    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name="index_status",
    )

    status = models.CharField(
        max_length=20,
        choices=INDEX_STATUS_CHOICES,
        default=INDEX_PENDING,
    )

    chunk_count = models.IntegerField(default=0)

    # md5 hex digest of extracted text — detects when re-indexing is needed
    content_hash = models.CharField(max_length=32, blank=True)

    error_message = models.TextField(blank=True)

    indexed_at   = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Document Index Status"

    def __str__(self):
        return f"IndexStatus({self.document.title}) [{self.status}]"


class DocumentComparison(models.Model):
    """
    A named comparison run across 2+ documents.

    The user selects documents, creates a comparison, and triggers
    the comparison engine via a Celery task.
    """

    STATUS_CHOICES = [
        ("PENDING",    "Pending"),
        ("PROCESSING", "Processing"),
        ("COMPLETED",  "Completed"),
        ("FAILED",     "Failed"),
    ]

    OVERALL_STATUS_CHOICES = [
        ("ALL_MATCH",      "All Match"),
        ("MISMATCH_FOUND", "Mismatches Found"),
        ("INCOMPLETE",     "Incomplete Data"),
    ]

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comparisons",
    )

    title = models.CharField(max_length=255, blank=True, default="Document Comparison")

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="PENDING",
    )

    overall_status = models.CharField(
        max_length=30,
        choices=OVERALL_STATUS_CHOICES,
        blank=True,
    )

    # AI-generated narrative summary of the comparison
    summary = models.TextField(blank=True)

    error_message = models.TextField(blank=True)

    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comparison #{self.pk} — {self.title} [{self.status}]"


class ComparisonDocument(models.Model):
    """
    Links a document into a comparison run.
    Stores the role label (e.g. "Invoice", "Purchase Order") for display.
    """

    comparison = models.ForeignKey(
        DocumentComparison,
        on_delete=models.CASCADE,
        related_name="comparison_documents",
    )

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="comparison_memberships",
    )

    role_label = models.CharField(
        max_length=100,
        blank=True,
        help_text="Display label, e.g. 'Invoice', 'Purchase Order'",
    )

    class Meta:
        unique_together = [("comparison", "document")]

    def __str__(self):
        return f"{self.comparison} ← {self.document.title}"


class ComparisonResult(models.Model):
    """
    One compared field across the documents in a comparison run.

    document_values stores a dict of {document_title: extracted_value}.
    status is MATCH / MISMATCH / MISSING.
    """

    STATUS_MATCH     = "MATCH"
    STATUS_MISMATCH  = "MISMATCH"
    STATUS_MISSING   = "MISSING"

    STATUS_CHOICES = [
        (STATUS_MATCH,    "Match"),
        (STATUS_MISMATCH, "Mismatch"),
        (STATUS_MISSING,  "Missing"),
    ]

    SEVERITY_CHOICES = [
        ("LOW",      "Low"),
        ("MEDIUM",   "Medium"),
        ("HIGH",     "High"),
        ("CRITICAL", "Critical"),
    ]

    comparison = models.ForeignKey(
        DocumentComparison,
        on_delete=models.CASCADE,
        related_name="results",
    )

    field_name = models.CharField(max_length=100)

    # { "Invoice.pdf": "105000", "Purchase_Order.pdf": "100000" }
    document_values = models.JSONField(default=dict)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_MATCH,
    )

    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        blank=True,
    )

    explanation = models.TextField(blank=True)

    # page references: { "Invoice.pdf": 1, "Purchase_Order.pdf": 2 }
    page_references = models.JSONField(default=dict)

    mismatch_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="AMOUNT_MISMATCH / DATE_MISMATCH / VENDOR_MISMATCH / etc.",
    )

    class Meta:
        ordering = [
            models.Case(
                models.When(status="MISMATCH", then=0),
                models.When(status="MISSING",  then=1),
                models.When(status="MATCH",    then=2),
                default=3,
                output_field=models.IntegerField(),
            )
        ]

    def __str__(self):
        return f"{self.comparison} | {self.field_name} → {self.status}"
