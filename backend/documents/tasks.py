"""
Celery background tasks for DocuMind AI.

Full pipeline (each task chains to the next on success):

    process_document(document_id)
        └─► extract text → save ExtractedContent
                └─► analyze_document(document_id)
                        └─► LLM classify + extract + summarize → save AIAnalysis
                └─► chunk_and_embed(document_id)          [Day 4]
                        └─► chunker → chunks → embed_texts → save DocumentChunks
                                └─► detect_document_risks(document_id)   [Day 6]
                                        └─► AI risk detection → save DocumentRisk rows
                                        └─► update Document.status → PENDING_APPROVAL
"""

import logging

from celery import shared_task
from django.conf import settings

from .models import Document, ExtractedContent, AIAnalysis, DocumentChunk, DocumentIndexStatus
from .services.extractor import extract_text
from .services.cleaner import clean_text, truncate_for_llm
from .services.chunker import create_chunks
from .services.embeddings import embed_texts
from .services.ai.provider import analyze_document as ai_analyze

logger = logging.getLogger(__name__)


# ─── Task 1: Text Extraction ──────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def process_document(self, document_id: int) -> dict:
    """
    Extract text from an uploaded document, save ExtractedContent,
    then dispatch both AI analysis and chunk+embed tasks.

    Steps:
        1. Set status → PROCESSING
        2. Extract text (PDF / DOCX / OCR)
        3. Save ExtractedContent (with extraction_method)
        4. Set status → PROCESSED
        5. Dispatch analyze_document  (Day 3)
        6. Dispatch chunk_and_embed   (Day 4)
    """
    logger.info("process_document started — document_id=%s", document_id)

    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error("Document id=%s not found — aborting.", document_id)
        return {"error": f"Document {document_id} not found"}

    try:
        # 1 — Mark processing
        document.status = "PROCESSING"
        document.save(update_fields=["status", "updated_at"])

        # 2 — Extract text
        text, page_count, extraction_method = extract_text(document.file.path)
        logger.info(
            "Document %s: extracted %d chars, %d pages, method=%s",
            document_id, len(text), page_count, extraction_method,
        )

        # 3 — Save ExtractedContent
        ExtractedContent.objects.update_or_create(
            document=document,
            defaults={
                "text": text,
                "page_count": page_count,
                "extraction_method": extraction_method,
            },
        )

        # 4 — Mark ANALYZING (AI analysis about to start)
        document.status = "ANALYZING"
        document.save(update_fields=["status", "updated_at"])

        # 5 — Chain AI analysis (Day 3)
        analyze_document.delay(document_id)

        # 6 — Chain chunk + embed (Day 4) — status moves to EMBEDDING inside that task
        chunk_and_embed.delay(document_id)

        return {
            "document_id": document_id,
            "status": "ANALYZING",
            "char_count": len(text),
            "page_count": page_count,
            "extraction_method": extraction_method,
        }

    except Exception as exc:
        logger.error("process_document failed for %s: %s", document_id, exc, exc_info=True)
        try:
            document.status = "FAILED"
            document.save(update_fields=["status", "updated_at"])
        except Exception:
            pass
        raise


# ─── Task 2: AI Analysis (Day 3) ──────────────────────────────────────────────

@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def analyze_document(self, document_id: int) -> dict:
    """
    Run LLM classification, field extraction, and summarisation.
    Saves result to AIAnalysis and updates Document.document_type.
    """
    logger.info("analyze_document started — document_id=%s", document_id)

    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error("Document %s not found — aborting AI task.", document_id)
        return {"error": f"Document {document_id} not found"}

    ai_analysis, _ = AIAnalysis.objects.get_or_create(document=document)

    try:
        try:
            extracted = document.extracted_content
        except ExtractedContent.DoesNotExist:
            raise ValueError(f"No ExtractedContent for document {document_id}.")

        if not extracted.text.strip():
            raise ValueError(f"Document {document_id} has empty extracted text.")

        ai_analysis.ai_status = "PROCESSING"
        ai_analysis.save(update_fields=["ai_status", "updated_at"])

        # Ensure document shows ANALYZING while AI works
        if document.status not in ("ANALYZING", "EMBEDDING"):
            document.status = "ANALYZING"
            document.save(update_fields=["status", "updated_at"])

        max_chars = getattr(settings, "AI_MAX_INPUT_CHARS", 12000)
        cleaned = clean_text(extracted.text)
        truncated = truncate_for_llm(cleaned, max_chars)

        result = ai_analyze(truncated)

        ai_analysis.document_type = result["document_type"]
        ai_analysis.confidence = result["confidence"]
        ai_analysis.extracted_data = result["extracted_data"]
        ai_analysis.summary = result["summary"]
        ai_analysis.model_name = result["model_name"]
        ai_analysis.ai_status = "COMPLETED"
        ai_analysis.error_message = ""
        ai_analysis.save()

        document.document_type = result["document_type"]
        document.save(update_fields=["document_type", "updated_at"])

        logger.info(
            "Document %s — AI done: type=%s confidence=%.0f%%",
            document_id, result["document_type"], result["confidence"] * 100,
        )
        return {
            "document_id": document_id,
            "document_type": result["document_type"],
            "confidence": result["confidence"],
            "ai_status": "COMPLETED",
        }

    except Exception as exc:
        logger.error("analyze_document failed for %s: %s", document_id, exc, exc_info=True)
        try:
            ai_analysis.ai_status = "FAILED"
            ai_analysis.error_message = str(exc)
            ai_analysis.save(update_fields=["ai_status", "error_message", "updated_at"])
        except Exception:
            pass
        raise


# ─── Task 3: Chunking + Embedding (Day 4) ─────────────────────────────────────

@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def chunk_and_embed(self, document_id: int) -> dict:
    """
    Split extracted text into overlapping chunks and generate embeddings.

    Steps:
        1. Load ExtractedContent
        2. Compute content hash — skip if unchanged and already READY
        3. Delete any existing chunks for this document (re-processing support)
        4. Mark DocumentIndexStatus → PROCESSING
        5. Split text into chunks using create_chunks()
        6. Batch-embed all chunk texts using embed_texts()
        7. Bulk-create DocumentChunk records with embeddings
        8. Mark DocumentIndexStatus → READY with chunk count + hash
    """
    import hashlib
    from django.utils import timezone

    logger.info("chunk_and_embed started — document_id=%s", document_id)

    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error("Document %s not found — aborting chunk task.", document_id)
        return {"error": f"Document {document_id} not found"}

    # Get or create index status record
    idx_status, _ = DocumentIndexStatus.objects.get_or_create(document=document)

    try:
        try:
            extracted = document.extracted_content
        except ExtractedContent.DoesNotExist:
            raise ValueError(f"No ExtractedContent for document {document_id}.")

        if not extracted.text.strip():
            logger.warning("Document %s has empty text — skipping chunking.", document_id)
            # Still mark READY so the document is usable (just without search)
            document.status = "READY"
            document.save(update_fields=["status", "updated_at"])
            idx_status.status = DocumentIndexStatus.INDEX_FAILED
            idx_status.error_message = "Extracted text is empty — nothing to index."
            idx_status.save()
            return {"document_id": document_id, "chunks": 0}

        # Compute content hash — if unchanged and already READY, skip re-indexing
        content_hash = hashlib.md5(extracted.text.encode("utf-8", errors="replace")).hexdigest()
        if (
            idx_status.status == DocumentIndexStatus.INDEX_READY
            and idx_status.content_hash == content_hash
        ):
            logger.info(
                "Document %s content unchanged (hash=%s) — skipping re-index.",
                document_id, content_hash,
            )
            document.status = "READY"
            document.save(update_fields=["status", "updated_at"])
            return {"document_id": document_id, "chunks": idx_status.chunk_count, "skipped": True}

        # Step 2 — Remove old chunks (idempotent re-processing)
        deleted_count, _ = DocumentChunk.objects.filter(document=document).delete()
        if deleted_count:
            logger.info("Deleted %d old chunks for document %s.", deleted_count, document_id)

        # Mark EMBEDDING — vector generation in progress
        document.status = "EMBEDDING"
        document.save(update_fields=["status", "updated_at"])

        idx_status.status = DocumentIndexStatus.INDEX_PROCESSING
        idx_status.content_hash = content_hash
        idx_status.error_message = ""
        idx_status.save(update_fields=["status", "content_hash", "error_message", "updated_at"])

        # Step 3 — Split into chunks
        chunks = create_chunks(extracted.text)
        if not chunks:
            logger.warning("No chunks produced for document %s.", document_id)
            idx_status.status = DocumentIndexStatus.INDEX_FAILED
            idx_status.error_message = "Chunking produced no chunks."
            idx_status.save()
            return {"document_id": document_id, "chunks": 0}

        # Step 4 — Batch embed all chunk texts
        texts = [c.content for c in chunks]
        vectors = embed_texts(texts)

        # Step 5 — Bulk create
        chunk_objects = [
            DocumentChunk(
                document=document,
                content=chunk.content,
                chunk_index=chunk.chunk_index,
                page_number=chunk.page_number,
                char_count=chunk.char_count,
                embedding=vector,
            )
            for chunk, vector in zip(chunks, vectors)
        ]
        DocumentChunk.objects.bulk_create(chunk_objects, batch_size=200)

        logger.info(
            "Document %s — %d chunks created and embedded.",
            document_id, len(chunk_objects),
        )

        # Mark READY — document is now fully searchable and chat-ready
        document.status = "READY"
        document.save(update_fields=["status", "updated_at"])

        idx_status.status      = DocumentIndexStatus.INDEX_READY
        idx_status.chunk_count = len(chunk_objects)
        idx_status.indexed_at  = timezone.now()
        idx_status.error_message = ""
        idx_status.save()

        # Step 6 — Chain AI risk detection (Day 6)
        detect_document_risks.delay(document_id)

        return {
            "document_id": document_id,
            "chunks": len(chunk_objects),
        }

    except Exception as exc:
        logger.error("chunk_and_embed failed for %s: %s", document_id, exc, exc_info=True)
        try:
            idx_status.status = DocumentIndexStatus.INDEX_FAILED
            idx_status.error_message = str(exc)[:500]
            idx_status.save(update_fields=["status", "error_message", "updated_at"])
        except Exception:
            pass
        raise


# ─── Task 4: AI Risk Detection (Day 6) ────────────────────────────────────────

@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def detect_document_risks(self, document_id: int) -> dict:
    """
    Run AI risk analysis on a processed document.

    Steps:
        1. Load document + extracted content
        2. Call detect_risks() from workflows.services
        3. Save DocumentRisk records (idempotent — deletes stale risks first)
        4. Update Document.status based on risk findings:
               risks found     → PENDING_APPROVAL  (requires manager review)
               no risks        → keep PROCESSED
        5. Create audit log entry for RISK_DETECTED
        6. Notify all managers with MANAGER role about the new document

    This task runs AFTER chunk_and_embed so that document_type from
    analyze_document is already populated before risk analysis begins.
    """
    logger.info("detect_document_risks started — document_id=%s", document_id)

    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error("Document %s not found — aborting risk task.", document_id)
        return {"error": f"Document {document_id} not found"}

    try:
        from workflows.services import detect_risks
        from audit.utils import log_action
        from audit.models import AuditLog

        risks = detect_risks(document)
        risk_count = len(risks)

        if risk_count > 0:
            # Determine highest severity across detected risks
            severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
            severities = [r.severity for r in risks]
            highest = next((s for s in severity_order if s in severities), "LOW")

            # Move document into approval workflow
            document.status = "PENDING_APPROVAL"
            document.save(update_fields=["status", "updated_at"])

            # Audit
            log_action(
                user=document.uploaded_by,
                action=AuditLog.RISK_DETECTED,
                document=document,
                description=(
                    f"{risk_count} risk(s) detected in '{document.title}'. "
                    f"Highest severity: {highest}. Document moved to PENDING_APPROVAL."
                ),
                extra_data={"risk_count": risk_count, "highest_severity": highest},
            )

            logger.info(
                "Document %s — %d risks detected (highest: %s), status → PENDING_APPROVAL",
                document_id, risk_count, highest,
            )
        else:
            logger.info(
                "Document %s — no risks detected, status remains %s",
                document_id, document.status,
            )

        # Step 7 — Chain deep analysis (comprehensive per-document AI analysis)
        deep_analyze_document.delay(document_id)

        return {
            "document_id": document_id,
            "risk_count": risk_count,
        }

    except Exception as exc:
        logger.error(
            "detect_document_risks failed for %s: %s", document_id, exc, exc_info=True
        )
        raise


# ─── Task 5: Deep Document Analysis ───────────────────────────────────────────

@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def deep_analyze_document(self, document_id: int) -> dict:
    """
    Run comprehensive AI deep analysis on a document.

    Produces a DocumentDeepAnalysis record containing:
        summary, key_information, important_dates, entities, amounts,
        missing_information, inconsistencies, risks, overall_risk_level,
        confidence_score

    Runs AFTER detect_document_risks so document_type is already populated.
    Safe to re-run — existing record is updated (upsert).
    """
    logger.info("deep_analyze_document started — document_id=%s", document_id)

    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error("Document %s not found — aborting deep analysis.", document_id)
        return {"error": f"Document {document_id} not found"}

    from .models import DocumentDeepAnalysis
    from .services.deep_analyzer import run_deep_analysis

    deep, _ = DocumentDeepAnalysis.objects.get_or_create(document=document)
    deep.status = "PROCESSING"
    deep.save(update_fields=["status", "updated_at"])

    try:
        result = run_deep_analysis(document)

        deep.summary              = result["summary"]
        deep.key_information      = result["key_information"]
        deep.important_dates      = result["important_dates"]
        deep.entities             = result["entities"]
        deep.amounts              = result["amounts"]
        deep.missing_information  = result["missing_information"]
        deep.inconsistencies      = result["inconsistencies"]
        deep.risks                = result["risks"]
        deep.overall_risk_level   = result["overall_risk_level"]
        deep.confidence_score     = result["confidence_score"]
        deep.status               = "COMPLETED"
        deep.error_message        = ""
        deep.save()

        logger.info(
            "deep_analyze_document done — doc=%s risks=%d issues=%d overall=%s",
            document_id,
            len(result["risks"]),
            len(result["missing_information"]) + len(result["inconsistencies"]),
            result["overall_risk_level"],
        )

        return {
            "document_id":       document_id,
            "overall_risk_level": result["overall_risk_level"],
            "risk_count":        len(result["risks"]),
        }

    except Exception as exc:
        logger.error(
            "deep_analyze_document failed for %s: %s", document_id, exc, exc_info=True
        )
        deep.status        = "FAILED"
        deep.error_message = str(exc)
        deep.save(update_fields=["status", "error_message", "updated_at"])
        raise


# ─── Task 6: Run Document Comparison ──────────────────────────────────────────

@shared_task(bind=True, max_retries=1, default_retry_delay=30)
def run_comparison_task(self, comparison_id: int) -> dict:
    """
    Execute the cross-document comparison engine for a DocumentComparison.

    Called when the user creates a comparison via the API.
    Delegates to documents.services.comparator.run_comparison().
    """
    logger.info("run_comparison_task started — comparison_id=%s", comparison_id)

    try:
        from .services.comparator import run_comparison
        run_comparison(comparison_id)
        return {"comparison_id": comparison_id, "status": "COMPLETED"}

    except Exception as exc:
        logger.error(
            "run_comparison_task failed for %s: %s", comparison_id, exc, exc_info=True
        )
        raise
