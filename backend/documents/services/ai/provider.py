"""
AI provider abstraction for DocuMind AI.

Architecture:
    DocumentViewSet / Celery task
           │
           ▼
    analyze_document()        ← single public entry point
           │
           ▼
    _classify()               ← step 1: what type of document?
           │
           ▼
    _extract_fields()         ← step 2: pull structured fields
           │
           ▼
    _summarize()              ← step 3: human-readable summary
           │
           ▼
    dict result               ← returned to Celery task → DB

Only this module knows about the OpenAI SDK.
All other code calls analyze_document(text) only.
Switching providers later means changing only this file.
"""

import json
import logging

from django.conf import settings

from .prompts import (
    build_classification_prompt,
    build_extraction_prompt,
    build_summary_prompt,
    SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)

# ─── Supported document types ─────────────────────────────────────────────────

VALID_DOCUMENT_TYPES = {
    "INVOICE", "CONTRACT", "PURCHASE_ORDER",
    "RECEIPT", "REPORT", "POLICY", "OTHER",
}


# ─── Internal LLM call ────────────────────────────────────────────────────────

_PLACEHOLDER_KEYS = {
    "", "your_openai_api_key_here", "your_api_key_here",
    "sk-...", "YOUR_API_KEY",
}


def _is_valid_api_key(key: str) -> bool:
    return bool(key) and key.strip() not in _PLACEHOLDER_KEYS


def _call_llm(user_prompt: str, expect_json: bool = True) -> str:
    """
    Send a prompt to the configured LLM and return the raw response text.

    Args:
        user_prompt:  The user-role message to send.
        expect_json:  If True, use response_format=json_object for OpenAI.

    Returns:
        Raw string response from the LLM.

    Raises:
        RuntimeError: If the provider is not configured or the call fails.
    """
    provider = getattr(settings, "LLM_PROVIDER", "openai").lower()
    api_key = getattr(settings, "LLM_API_KEY", "")
    model = getattr(settings, "LLM_MODEL", "gpt-4o-mini")
    temperature = getattr(settings, "AI_TEMPERATURE", 0.1)

    if not api_key:
        raise RuntimeError(
            "LLM_API_KEY is not set. "
            "Add it to backend/.env and restart Django + Celery."
        )

    if provider == "openai":
        return _call_openai(
            api_key=api_key,
            model=model,
            temperature=temperature,
            user_prompt=user_prompt,
            expect_json=expect_json,
        )

    raise RuntimeError(f"Unsupported LLM provider: '{provider}'")


def _call_openai(
    api_key: str,
    model: str,
    temperature: float,
    user_prompt: str,
    expect_json: bool,
) -> str:
    """Call the OpenAI Chat Completions API."""
    from openai import OpenAI  # imported here to keep import optional

    client = OpenAI(api_key=api_key)

    kwargs: dict = {
        "model": model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }

    if expect_json:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


# ─── Step 1: Classification ───────────────────────────────────────────────────

def _classify(text: str) -> tuple[str, float]:
    """
    Classify the document type using the LLM.

    Returns:
        (document_type, confidence)  e.g. ("INVOICE", 0.96)
    """
    prompt = build_classification_prompt(text)
    raw = _call_llm(prompt, expect_json=True)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Classification JSON parse error: %s\nRaw: %s", exc, raw)
        return "OTHER", 0.0

    doc_type = str(data.get("document_type", "OTHER")).upper().strip()
    confidence = float(data.get("confidence", 0.0))

    # Clamp to valid values
    if doc_type not in VALID_DOCUMENT_TYPES:
        logger.warning("LLM returned unknown document_type '%s' → OTHER", doc_type)
        doc_type = "OTHER"

    confidence = max(0.0, min(1.0, confidence))

    logger.info("Classification result: %s (%.0f%%)", doc_type, confidence * 100)
    return doc_type, confidence


# ─── Step 2: Field extraction ─────────────────────────────────────────────────

def _extract_fields(text: str, document_type: str) -> dict:
    """
    Extract structured fields from the document text.

    Returns:
        dict of extracted fields (nulls for missing values).
    """
    prompt = build_extraction_prompt(text, document_type)
    raw = _call_llm(prompt, expect_json=True)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Extraction JSON parse error: %s\nRaw: %s", exc, raw)
        return {}

    return data


# ─── Step 3: Summary ──────────────────────────────────────────────────────────

def _summarize(text: str, document_type: str) -> str:
    """
    Generate a concise human-readable summary of the document.

    Returns:
        2–4 sentence plain-English summary string.
    """
    prompt = build_summary_prompt(text, document_type)
    summary = _call_llm(prompt, expect_json=False)
    return summary.strip()


# ─── Public entry point ───────────────────────────────────────────────────────

def analyze_document(text: str) -> dict:
    """
    Run the complete AI analysis pipeline on extracted document text.

    Steps:
        1. Classify → document_type + confidence
        2. Extract  → structured fields (type-specific schema)
        3. Summarize → plain-English summary

    Args:
        text: Cleaned, truncated document text.

    Returns:
        {
            "document_type": str,
            "confidence":    float,
            "extracted_data": dict,
            "summary":       str,
            "model_name":    str,
        }

    Raises:
        Exception: Propagated to Celery task for proper FAILED handling.
    """
    model_name = getattr(settings, "LLM_MODEL", "unknown")

    logger.info("Starting AI analysis with model '%s'", model_name)

    # Step 1 — Classify
    document_type, confidence = _classify(text)

    # Step 2 — Extract fields
    extracted_data = _extract_fields(text, document_type)

    # Step 3 — Summarize
    summary = _summarize(text, document_type)

    result = {
        "document_type": document_type,
        "confidence": confidence,
        "extracted_data": extracted_data,
        "summary": summary,
        "model_name": model_name,
    }

    logger.info(
        "AI analysis complete: type=%s confidence=%.0f%% fields=%d",
        document_type,
        confidence * 100,
        len(extracted_data),
    )

    return result
