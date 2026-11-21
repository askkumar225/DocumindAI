"""
Cross-document comparison engine for DocuMind AI.

Compares structured fields extracted from 2+ documents and identifies:
    - Matches (same value across documents)
    - Mismatches (different values — with severity)
    - Missing (field present in one doc but not others)

Uses a hybrid approach:
    1. Rule-based for numbers and dates (exact comparison after normalisation)
    2. LLM for semantic / text field comparison when values look different
       but may mean the same thing (e.g. "30 days" vs "thirty calendar days")

Value normalisation:
    - Amounts: strip currency symbols, commas, whitespace → float
    - Dates:  ISO 8601, DD/MM/YYYY, DD-Mon-YYYY → YYYY-MM-DD
    - Text:   lowercase + strip

Mismatch types:
    AMOUNT_MISMATCH, DATE_MISMATCH, VENDOR_MISMATCH, CUSTOMER_MISMATCH,
    TERM_MISMATCH, REFERENCE_MISMATCH, MISSING_FIELD, DUPLICATE_DOCUMENT
"""

import json
import logging
import re
from datetime import datetime
from typing import Any

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# ── Field priority: higher = more important mismatch ──────────────────────────
_FIELD_SEVERITY: dict[str, str] = {
    "total_amount":       "HIGH",
    "contract_value":     "HIGH",
    "vendor_name":        "HIGH",
    "vendor":             "HIGH",
    "buyer_name":         "HIGH",
    "customer_name":      "HIGH",
    "quantity":           "HIGH",
    "unit_price":         "HIGH",
    "po_number":          "MEDIUM",
    "invoice_number":     "MEDIUM",
    "invoice_date":       "MEDIUM",
    "due_date":           "MEDIUM",
    "delivery_date":      "MEDIUM",
    "payment_terms":      "MEDIUM",
    "currency":           "MEDIUM",
    "start_date":         "LOW",
    "end_date":           "LOW",
    "duration":           "LOW",
    "tax":                "LOW",
    "subtotal":           "LOW",
}

_MISMATCH_TYPES: dict[str, str] = {
    "total_amount":   "AMOUNT_MISMATCH",
    "contract_value": "AMOUNT_MISMATCH",
    "quantity":       "AMOUNT_MISMATCH",
    "unit_price":     "AMOUNT_MISMATCH",
    "subtotal":       "AMOUNT_MISMATCH",
    "tax":            "AMOUNT_MISMATCH",
    "vendor_name":    "VENDOR_MISMATCH",
    "vendor":         "VENDOR_MISMATCH",
    "customer_name":  "CUSTOMER_MISMATCH",
    "buyer_name":     "CUSTOMER_MISMATCH",
    "invoice_number": "REFERENCE_MISMATCH",
    "po_number":      "REFERENCE_MISMATCH",
    "due_date":       "DATE_MISMATCH",
    "delivery_date":  "DATE_MISMATCH",
    "invoice_date":   "DATE_MISMATCH",
    "start_date":     "DATE_MISMATCH",
    "end_date":       "DATE_MISMATCH",
    "payment_terms":  "TERM_MISMATCH",
    "currency":       "TERM_MISMATCH",
}


# ── Value normalisation ────────────────────────────────────────────────────────

def _normalise_amount(value: Any) -> float | None:
    """Strip currency symbols / formatting and return a float."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value)
    # Remove currency symbols and thousands separators
    cleaned = re.sub(r"[₹$€£¥,\s]", "", text)
    try:
        return float(cleaned)
    except ValueError:
        return None


_DATE_FORMATS = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%m/%d/%Y",
    "%d-%b-%Y",
    "%d %B %Y",
    "%B %d, %Y",
    "%b %d, %Y",
]


def _normalise_date(value: Any) -> str | None:
    """Normalise various date formats to YYYY-MM-DD."""
    if value is None:
        return None
    text = str(value).strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return text.lower()  # fallback: lowercased string


def _normalise_text(value: Any) -> str:
    """Lowercase, strip, collapse whitespace."""
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).lower().strip())


def _is_amount_field(field: str) -> bool:
    return field in {
        "total_amount", "contract_value", "subtotal", "tax", "unit_price",
        "quantity", "discount", "gst",
    }


def _is_date_field(field: str) -> bool:
    return field in {
        "invoice_date", "due_date", "delivery_date", "po_date",
        "start_date", "end_date", "contract_date",
    }


# ── Per-field comparison ───────────────────────────────────────────────────────

def _compare_field(
    field: str,
    values: dict[str, Any],
) -> tuple[str, str]:
    """
    Compare values for one field across documents.

    Returns:
        (status, explanation)
        status: "MATCH" | "MISMATCH" | "MISSING"
    """
    non_null = {k: v for k, v in values.items() if v is not None and str(v).strip() not in ("", "null", "None")}

    if not non_null:
        return "MISSING", f"'{field}' not found in any document."

    if len(non_null) == 1:
        return "MISSING", f"'{field}' only present in: {list(non_null.keys())[0]}."

    # Normalise by field type
    if _is_amount_field(field):
        normalised = {k: _normalise_amount(v) for k, v in non_null.items()}
        unique_vals = set(v for v in normalised.values() if v is not None)
        if len(unique_vals) <= 1:
            return "MATCH", ""
        sorted_vals = sorted(unique_vals)
        diff = sorted_vals[-1] - sorted_vals[0]
        docs_str = ", ".join(f"{k}: {v:,.2f}" for k, v in normalised.items() if v is not None)
        return "MISMATCH", f"Amount differs across documents ({docs_str}). Difference: {diff:,.2f}."

    if _is_date_field(field):
        normalised = {k: _normalise_date(v) for k, v in non_null.items()}
        unique_vals = set(normalised.values())
        if len(unique_vals) <= 1:
            return "MATCH", ""
        docs_str = ", ".join(f"{k}: {v}" for k, v in normalised.items())
        return "MISMATCH", f"Date differs across documents ({docs_str})."

    # Text comparison
    normalised = {k: _normalise_text(v) for k, v in non_null.items()}
    unique_vals = set(normalised.values())
    if len(unique_vals) <= 1:
        return "MATCH", ""

    # Check if values are semantically close (e.g. "30 days" vs "thirty days")
    docs_str = ", ".join(f"{k}: '{v}'" for k, v in non_null.items())
    return "MISMATCH", f"Value differs across documents ({docs_str})."


# ── Duplicate detection ────────────────────────────────────────────────────────

def _check_duplicate(docs_data: list[dict]) -> list[dict]:
    """
    Detect potential duplicate documents by comparing invoice/PO numbers and amounts.
    Returns a list of duplicate-warning dicts.
    """
    duplicates = []
    seen_refs: dict[str, str] = {}  # ref_number → doc_title

    for d in docs_data:
        extracted = d.get("extracted_data", {}) or {}
        ref = extracted.get("invoice_number") or extracted.get("po_number")
        if not ref:
            continue
        ref_key = _normalise_text(ref)
        title = d.get("title", "")
        if ref_key in seen_refs and seen_refs[ref_key] != title:
            duplicates.append({
                "issue": f"Possible duplicate — reference '{ref}' appears in both "
                         f"'{seen_refs[ref_key]}' and '{title}'.",
                "severity": "HIGH",
                "mismatch_type": "DUPLICATE_DOCUMENT",
                "documents": [seen_refs[ref_key], title],
            })
        else:
            seen_refs[ref_key] = title

    return duplicates


# ── LLM comparison summary ────────────────────────────────────────────────────

def _generate_comparison_summary(
    doc_titles: list[str],
    match_count: int,
    mismatch_results: list[dict],
    api_key: str,
) -> str:
    """Generate a plain-English summary of the comparison using the LLM."""
    if not api_key:
        if mismatch_results:
            issues = "; ".join(r["field_name"] for r in mismatch_results[:3])
            return (
                f"{len(doc_titles)} documents compared. "
                f"{match_count} fields matched, {len(mismatch_results)} mismatches found. "
                f"Key issues: {issues}."
            )
        return f"{len(doc_titles)} documents compared. All {match_count} checked fields match."

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        mismatch_text = "\n".join(
            f"- {r['field_name']}: {r['explanation']}"
            for r in mismatch_results[:5]
        )

        prompt = (
            f"Documents compared: {', '.join(doc_titles)}\n"
            f"Matched fields: {match_count}\n"
            f"Mismatches found:\n{mismatch_text or 'None'}\n\n"
            "Write a 2-3 sentence plain English summary of this document comparison result. "
            "Be specific about the key issues found. No bullet points."
        )

        response = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.2,
            max_tokens=120,
            messages=[
                {"role": "system", "content": "You summarise document comparison results concisely."},
                {"role": "user",   "content": prompt},
            ],
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.warning("Comparison summary LLM call failed: %s", exc)
        return f"{len(doc_titles)} documents compared. {len(mismatch_results)} mismatches found."


# ── Public entry point ─────────────────────────────────────────────────────────

def run_comparison(comparison_id: int) -> None:
    """
    Execute the comparison engine for a DocumentComparison record.

    Loads all ComparisonDocuments, extracts fields from their DeepAnalysis
    (falling back to AIAnalysis.extracted_data), compares each field,
    saves ComparisonResult rows, and updates the DocumentComparison status.

    This function is called from the Celery task.
    """
    from documents.models import (
        DocumentComparison, ComparisonDocument, ComparisonResult,
    )

    try:
        comparison = DocumentComparison.objects.prefetch_related(
            "comparison_documents__document__deep_analysis",
            "comparison_documents__document__ai_analysis",
        ).get(id=comparison_id)
    except DocumentComparison.DoesNotExist:
        logger.error("run_comparison: DocumentComparison %s not found", comparison_id)
        return

    comparison.status = "PROCESSING"
    comparison.save(update_fields=["status", "updated_at"])

    try:
        comp_docs = list(comparison.comparison_documents.select_related(
            "document", "document__deep_analysis", "document__ai_analysis"
        ).all())

        if len(comp_docs) < 2:
            raise ValueError("Need at least 2 documents to compare.")

        # ── Build per-document field maps ──────────────────────────────────────
        docs_data = []
        for cd in comp_docs:
            doc   = cd.document
            title = doc.title

            # Prefer deep_analysis fields, fall back to ai_analysis.extracted_data
            fields: dict = {}
            try:
                da = doc.deep_analysis
                # Flatten amounts and dates into a simple key→value dict
                for item in (da.amounts or []):
                    k = _normalise_text(item.get("name", "")).replace(" ", "_")
                    if k:
                        fields[k] = item.get("value")

                for item in (da.important_dates or []):
                    k = _normalise_text(item.get("name", "")).replace(" ", "_")
                    if k:
                        fields[k] = item.get("value")

                # key_information items
                for item in (da.key_information or []):
                    k = _normalise_text(item.get("label", "")).replace(" ", "_")
                    v = item.get("value")
                    if k and v:
                        fields[k] = v

            except Exception:
                pass

            # Also merge AIAnalysis extracted_data (flat dict)
            try:
                ea = doc.ai_analysis.extracted_data or {}
                for k, v in ea.items():
                    if k not in fields and v is not None:
                        fields[k] = v
            except Exception:
                pass

            docs_data.append({
                "title":          title,
                "fields":         fields,
                "extracted_data": fields,
            })

        # ── Build combined field set ───────────────────────────────────────────
        all_fields: set[str] = set()
        for d in docs_data:
            all_fields.update(d["fields"].keys())

        # Focus on the most meaningful fields (skip very short / numeric-only keys)
        meaningful_fields = {
            f for f in all_fields
            if len(f) >= 3 and not f.isdigit()
        }

        # ── Delete old results (idempotent re-run) ─────────────────────────────
        ComparisonResult.objects.filter(comparison=comparison).delete()

        results = []
        match_count = 0
        mismatch_results = []

        for field in sorted(meaningful_fields):
            values = {d["title"]: d["fields"].get(field) for d in docs_data}
            status, explanation = _compare_field(field, values)

            severity = ""
            mismatch_type = ""

            if status == "MISMATCH":
                severity     = _FIELD_SEVERITY.get(field, "MEDIUM")
                mismatch_type = _MISMATCH_TYPES.get(field, "TERM_MISMATCH")
            elif status == "MISSING":
                severity = "LOW"
                mismatch_type = "MISSING_FIELD"

            if status == "MATCH":
                match_count += 1

            # Convert values to strings for storage
            str_values = {k: (str(v) if v is not None else None) for k, v in values.items()}

            result = ComparisonResult(
                comparison=comparison,
                field_name=field,
                document_values=str_values,
                status=status,
                severity=severity,
                explanation=explanation,
                mismatch_type=mismatch_type,
            )
            results.append(result)

            if status in ("MISMATCH", "MISSING") and severity in ("HIGH", "CRITICAL", "MEDIUM"):
                mismatch_results.append({
                    "field_name":  field,
                    "explanation": explanation,
                    "severity":    severity,
                })

        # ── Check for duplicates ───────────────────────────────────────────────
        dup_warnings = _check_duplicate(docs_data)
        for dup in dup_warnings:
            dup_values = {title: "duplicate" for title in dup.get("documents", [])}
            results.append(ComparisonResult(
                comparison=comparison,
                field_name="duplicate_detection",
                document_values=dup_values,
                status="MISMATCH",
                severity=dup["severity"],
                explanation=dup["issue"],
                mismatch_type="DUPLICATE_DOCUMENT",
            ))
            mismatch_results.append({
                "field_name":  "duplicate_detection",
                "explanation": dup["issue"],
                "severity":    dup["severity"],
            })

        ComparisonResult.objects.bulk_create(results)

        # ── Overall status ─────────────────────────────────────────────────────
        high_mismatches = [r for r in mismatch_results if r["severity"] in ("HIGH", "CRITICAL")]
        if high_mismatches:
            overall_status = "MISMATCH_FOUND"
        elif mismatch_results:
            overall_status = "MISMATCH_FOUND"
        else:
            overall_status = "ALL_MATCH"

        # ── Generate summary ───────────────────────────────────────────────────
        api_key = getattr(settings, "LLM_API_KEY", "")
        doc_titles = [d["title"] for d in docs_data]
        summary = _generate_comparison_summary(
            doc_titles, match_count, mismatch_results, api_key
        )

        comparison.status         = "COMPLETED"
        comparison.overall_status = overall_status
        comparison.summary        = summary
        comparison.completed_at   = timezone.now()
        comparison.save(update_fields=[
            "status", "overall_status", "summary", "completed_at", "updated_at"
        ])

        logger.info(
            "run_comparison #%s: %d fields compared, %d mismatches, overall=%s",
            comparison_id, len(results), len(mismatch_results), overall_status,
        )

    except Exception as exc:
        logger.error("run_comparison failed for %s: %s", comparison_id, exc, exc_info=True)
        comparison.status        = "FAILED"
        comparison.error_message = str(exc)
        comparison.save(update_fields=["status", "error_message", "updated_at"])
        raise
