"""
Workflow services for DocuMind AI — Day 6.

Services:
    detect_risks(document)     — AI-powered risk detection, saves DocumentRisk rows
    create_notification(...)   — helper to create Notification records
    send_approval_notification — notify reviewer of a new approval request
    send_decision_notification — notify requester of approve/reject decision
"""

import json
import logging

from django.conf import settings
from django.utils import timezone

from documents.services.ai.provider import _call_llm  # reuse existing LLM caller

logger = logging.getLogger(__name__)

# ─── Risk Detection Prompt ─────────────────────────────────────────────────────

_RISK_SYSTEM_PROMPT = """
You are an AI document risk analyst for an enterprise document management system.
Your job is to identify potential risks in business documents.

IMPORTANT:
- You detect POTENTIAL risks only — you do not make final legal or business decisions.
- Always recommend human review.
- Respond ONLY with valid JSON — no markdown, no prose.
"""

_RISK_USER_PROMPT_TEMPLATE = """
Analyze the following document text for potential risks.

Document Type: {document_type}

Document Text:
{text}

Return a JSON object with this exact structure:
{{
    "overall_severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "risks": [
        {{
            "title": "Short risk title (max 100 chars)",
            "description": "Clear description of the risk and why it is a concern",
            "severity": "LOW|MEDIUM|HIGH|CRITICAL",
            "source_text": "The exact sentence or clause from the document that triggered this risk (max 300 chars)",
            "page_number": null
        }}
    ]
}}

Risk categories to check (not exhaustive):
- Missing or unusual termination clauses
- Unlimited or uncapped liability
- Unusual payment terms or very long payment windows (>60 days)
- Automatic renewal clauses
- Long notice periods (>90 days)
- Missing required signatures or authorization
- High financial exposure or penalties
- Indemnification clauses that are one-sided
- Jurisdiction or governing law concerns
- Missing key dates (start date, end date, payment due date)
- Confidentiality or IP ownership concerns

If no risks are detected, return: {{"overall_severity": "LOW", "risks": []}}
"""


# ─── Public entry point ────────────────────────────────────────────────────────

def detect_risks(document) -> list:
    """
    Run AI risk detection on a document and save results to DocumentRisk.

    Args:
        document: Document model instance (must have extracted_content).

    Returns:
        List of created DocumentRisk instances.

    This function is called from the Celery task after chunk_and_embed completes.
    It is safe to call multiple times — existing risks for the document are
    deleted before new ones are saved (idempotent).
    """
    from .models import DocumentRisk  # avoid circular import at module level

    logger.info("detect_risks started — document_id=%s", document.id)

    # Load extracted text
    try:
        extracted = document.extracted_content
    except Exception:
        logger.warning("detect_risks: no extracted content for document %s", document.id)
        return []

    text = extracted.text.strip()
    if not text:
        logger.warning("detect_risks: empty text for document %s", document.id)
        return []

    # Truncate to avoid exceeding token limits
    max_chars = min(getattr(settings, "AI_MAX_INPUT_CHARS", 12000), 10000)
    if len(text) > max_chars:
        text = text[:max_chars] + "\n[...truncated for risk analysis]"

    document_type = getattr(document, "document_type", "UNKNOWN") or "UNKNOWN"
    prompt = _RISK_USER_PROMPT_TEMPLATE.format(
        document_type=document_type,
        text=text,
    )

    # Call LLM
    try:
        raw = _call_llm(prompt, expect_json=True)
    except Exception as exc:
        logger.error("detect_risks: LLM call failed for document %s: %s", document.id, exc)
        return []

    # Parse response
    try:
        if isinstance(raw, str):
            data = json.loads(raw)
        else:
            data = raw
    except (json.JSONDecodeError, TypeError) as exc:
        logger.error("detect_risks: invalid JSON from LLM for document %s: %s", document.id, exc)
        return []

    overall_severity = _validate_severity(data.get("overall_severity", "LOW"))
    risks_data = data.get("risks", [])

    if not isinstance(risks_data, list):
        logger.warning("detect_risks: 'risks' field is not a list for document %s", document.id)
        risks_data = []

    # Delete stale risks before saving new ones (idempotent)
    deleted, _ = DocumentRisk.objects.filter(document=document).delete()
    if deleted:
        logger.info("detect_risks: deleted %d stale risks for document %s", deleted, document.id)

    # Build and bulk-create risk records
    risk_objects = []
    for item in risks_data:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "Unnamed risk"))[:255]
        description = str(item.get("description", ""))
        severity = _validate_severity(item.get("severity", "MEDIUM"))
        source_text = str(item.get("source_text", ""))[:500]
        page_number = item.get("page_number")
        if page_number is not None:
            try:
                page_number = int(page_number)
            except (TypeError, ValueError):
                page_number = None

        risk_objects.append(DocumentRisk(
            document=document,
            title=title,
            description=description,
            severity=severity,
            source_text=source_text,
            page_number=page_number,
            overall_severity=overall_severity,
        ))

    created = DocumentRisk.objects.bulk_create(risk_objects)
    logger.info(
        "detect_risks: saved %d risks (overall=%s) for document %s",
        len(created), overall_severity, document.id,
    )
    return created


def _validate_severity(value: str) -> str:
    """Normalise and validate a severity string. Defaults to MEDIUM."""
    valid = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    v = str(value).upper().strip()
    return v if v in valid else "MEDIUM"


# ─── Notification helpers ──────────────────────────────────────────────────────

def create_notification(
    user,
    title: str,
    message: str,
    notification_type: str = "INFO",
    document=None,
    approval_request=None,
) -> None:
    """
    Create an in-app notification for a user.

    Safe to call from Celery tasks and signal handlers.
    Errors are logged but never re-raised so they cannot break the main flow.
    """
    from notifications.models import Notification  # avoid circular import

    try:
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            document=document,
            approval_request=approval_request,
        )
        logger.debug("Notification created for user %s: %s", user.pk, title)
    except Exception as exc:
        logger.error("Failed to create notification for user %s: %s", user.pk, exc)


def send_approval_notification(approval_request) -> None:
    """Notify the reviewer that a new approval request has been assigned."""
    doc = approval_request.document
    requester = approval_request.requested_by

    # Determine overall risk level for the notification
    from .models import DocumentRisk
    highest = _get_highest_severity(doc)

    create_notification(
        user=approval_request.reviewer,
        title="New document requires your approval",
        message=(
            f'"{doc.title}" submitted by {requester.username} requires your review. '
            f'Overall risk level: {highest or "UNKNOWN"}.'
        ),
        notification_type="WARNING" if highest in ("HIGH", "CRITICAL") else "INFO",
        document=doc,
        approval_request=approval_request,
    )


def send_decision_notification(approval_request) -> None:
    """Notify the document owner of the approval decision."""
    doc = approval_request.document
    status = approval_request.status
    reviewer = approval_request.reviewer

    if status == "APPROVED":
        title = f'Your document "{doc.title}" has been approved'
        message = f'"{doc.title}" was approved by {reviewer.username}.'
        ntype = "SUCCESS"
    elif status == "REJECTED":
        title = f'Your document "{doc.title}" was rejected'
        comments = approval_request.comments or "No reason provided."
        message = f'"{doc.title}" was rejected by {reviewer.username}. Reason: {comments}'
        ntype = "ERROR"
    else:  # NEEDS_CHANGES
        title = f'Your document "{doc.title}" needs changes'
        comments = approval_request.comments or "No comments provided."
        message = f'"{doc.title}" requires changes. Reviewer notes: {comments}'
        ntype = "WARNING"

    create_notification(
        user=approval_request.requested_by,
        title=title,
        message=message,
        notification_type=ntype,
        document=doc,
        approval_request=approval_request,
    )


def _get_highest_severity(document) -> str | None:
    """Return the highest severity level among a document's risks."""
    from .models import DocumentRisk
    order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    risks = DocumentRisk.objects.filter(document=document).values_list("severity", flat=True)
    for level in order:
        if level in risks:
            return level
    return None
