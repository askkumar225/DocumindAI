"""
Expected output schemas for LLM responses.

These define the JSON structure the LLM must return for each
document type. They are used by provider.py for validation,
and documented here as the single source of truth for AI output shape.

All field values should be null (not fabricated) when not present
in the source document.
"""

from typing import Any

# ─── Classification schema ────────────────────────────────────────────────────

CLASSIFICATION_SCHEMA: dict[str, Any] = {
    "document_type": "string — one of: INVOICE, CONTRACT, PURCHASE_ORDER, RECEIPT, REPORT, POLICY, OTHER",
    "confidence": "float between 0.0 and 1.0",
}

# ─── Extraction schemas per document type ────────────────────────────────────

INVOICE_SCHEMA: dict[str, Any] = {
    "invoice_number": "string or null",
    "vendor_name": "string or null",
    "customer_name": "string or null",
    "invoice_date": "ISO date string (YYYY-MM-DD) or null",
    "due_date": "ISO date string (YYYY-MM-DD) or null",
    "subtotal": "number or null",
    "tax": "number or null",
    "gst": "number or null",
    "discount": "number or null",
    "total_amount": "number or null",
    "currency": "ISO 4217 currency code (e.g. INR, USD) or null",
    "payment_terms": "string or null",
    "po_reference": "string or null",
}

CONTRACT_SCHEMA: dict[str, Any] = {
    "parties": "array of party name strings",
    "contract_date": "ISO date string or null",
    "start_date": "ISO date string or null",
    "end_date": "ISO date string or null",
    "duration": "string or null",
    "contract_value": "number or null",
    "currency": "string or null",
    "payment_terms": "string or null",
    "termination_notice": "string or null",
    "automatic_renewal": "boolean or null",
    "governing_law": "string or null",
    "penalty_clauses": "string or null",
}

PURCHASE_ORDER_SCHEMA: dict[str, Any] = {
    "po_number": "string or null",
    "vendor_name": "string or null",
    "buyer_name": "string or null",
    "po_date": "ISO date string or null",
    "delivery_date": "ISO date string or null",
    "items": "array of {description, quantity, unit_price} or []",
    "subtotal": "number or null",
    "tax": "number or null",
    "total_amount": "number or null",
    "currency": "string or null",
    "payment_terms": "string or null",
    "delivery_address": "string or null",
}

RECEIPT_SCHEMA: dict[str, Any] = {
    "receipt_number": "string or null",
    "merchant_name": "string or null",
    "date": "ISO date string or null",
    "items": "array of {description, amount} or []",
    "subtotal": "number or null",
    "tax": "number or null",
    "total_amount": "number or null",
    "currency": "string or null",
    "payment_method": "string or null",
}

GENERIC_SCHEMA: dict[str, Any] = {
    "title": "string or null",
    "date": "ISO date string or null",
    "author": "string or null",
    "organization": "string or null",
    "key_topics": "array of strings",
}

# ─── Schema registry ──────────────────────────────────────────────────────────

SCHEMA_MAP: dict[str, dict[str, Any]] = {
    "INVOICE": INVOICE_SCHEMA,
    "CONTRACT": CONTRACT_SCHEMA,
    "PURCHASE_ORDER": PURCHASE_ORDER_SCHEMA,
    "RECEIPT": RECEIPT_SCHEMA,
    "REPORT": GENERIC_SCHEMA,
    "POLICY": GENERIC_SCHEMA,
    "OTHER": GENERIC_SCHEMA,
}


def get_schema(document_type: str) -> dict[str, Any]:
    """Return the extraction schema for a given document type."""
    return SCHEMA_MAP.get(document_type.upper(), GENERIC_SCHEMA)
