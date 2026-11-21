"""
Deep document analysis service for DocuMind AI.

Performs a comprehensive single-document analysis using the LLM.
Returns structured JSON covering every dimension of the document:
    - summary
    - key_information (facts)
    - important_dates
    - entities (people, companies, locations)
    - amounts (financial values)
    - missing_information (required but absent fields)
    - inconsistencies (conflicting values / statements)
    - risks (potential issues requiring review)
    - overall_risk_level
    - confidence_score

Important:
    AI findings use safe language — "Potential Issue", "Needs Review" —
    never definitive legal conclusions.
"""

import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

# ── Deep analysis prompt ───────────────────────────────────────────────────────

_DEEP_ANALYSIS_SYSTEM = """You are DocuMind AI, an expert document intelligence system.
Your role is to analyze enterprise business documents and return structured JSON.

Rules you must ALWAYS follow:
1. Return ONLY valid JSON — no markdown, no code blocks, no explanations outside JSON.
2. Never fabricate or infer values not present in the document. Use null for missing fields.
3. Use safe, professional language: "Potential issue", "Needs review", "Inconsistency detected".
   Never claim something is definitely illegal, fraudulent, or invalid.
4. All dates must use ISO 8601 format: YYYY-MM-DD.
5. All monetary amounts must be plain numbers (not formatted strings).
6. severity must be one of: LOW, MEDIUM, HIGH, CRITICAL.
7. Your output must be parseable by Python json.loads()."""

_DEEP_ANALYSIS_PROMPT = """Perform a comprehensive analysis of the following business document.

Return a JSON object matching EXACTLY this schema:
{{
    "document_type": "string — Contract/Invoice/Purchase Order/Report/Policy/Receipt/Resume/Other",
    "summary": "string — 3-5 sentence plain English summary of the document",
    "key_information": [
        {{"label": "string", "value": "string", "page": number_or_null}}
    ],
    "important_dates": [
        {{"name": "string", "value": "YYYY-MM-DD or null", "description": "string", "page": number_or_null}}
    ],
    "entities": [
        {{"name": "string", "type": "PERSON/COMPANY/LOCATION/OTHER", "context": "string"}}
    ],
    "amounts": [
        {{"name": "string", "value": number_or_null, "currency": "string or null",
           "description": "string", "page": number_or_null}}
    ],
    "missing_information": [
        {{"issue": "string — what appears to be missing", "severity": "LOW/MEDIUM/HIGH/CRITICAL",
           "description": "string — why this might matter"}}
    ],
    "inconsistencies": [
        {{"issue": "string — what appears inconsistent", "severity": "LOW/MEDIUM/HIGH/CRITICAL",
           "description": "string — explanation", "locations": ["page X", "section Y"]}}
    ],
    "risks": [
        {{"title": "string", "severity": "LOW/MEDIUM/HIGH/CRITICAL",
           "description": "string — plain English explanation (not legal advice)",
           "source_text": "string — the exact clause/sentence from the document",
           "page": number_or_null}}
    ],
    "overall_risk_level": "LOW/MEDIUM/HIGH/CRITICAL",
    "confidence_score": 0.0_to_1.0
}}

Important analysis guidelines:
- For missing_information: only flag fields that are EXPECTED for this document type
- For inconsistencies: look for conflicting amounts, dates, or names between different sections
- For risks: use categories like "Unlimited liability", "Auto-renewal", "Unusual payment terms",
  "Missing signature", "High penalty clause" — describe as potential issues, not definitive problems
- Be comprehensive but precise. Empty arrays are fine if nothing was found.

Document Type: {document_type}

DOCUMENT TEXT:
{text}

Return only the JSON object. No other text."""


_PLACEHOLDER_KEYS = {
    "", "your_openai_api_key_here", "your_api_key_here",
    "sk-...", "YOUR_API_KEY",
}


def _is_valid_api_key(key: str) -> bool:
    return bool(key) and key.strip() not in _PLACEHOLDER_KEYS


def _call_deep_analysis_llm(text: str, document_type: str) -> dict:
    """Call the LLM for deep analysis and parse the JSON response."""
    api_key = getattr(settings, "LLM_API_KEY", "").strip()
    model   = getattr(settings, "LLM_MODEL", "gpt-4o-mini")
    temp    = 0.1  # low temperature for factual extraction

    if not _is_valid_api_key(api_key):
        raise RuntimeError(
            "LLM_API_KEY is not configured or still set to a placeholder value. "
            "Set a real API key in backend/.env."
        )

    from openai import OpenAI
    client = OpenAI(api_key=api_key)

    prompt = _DEEP_ANALYSIS_PROMPT.format(
        document_type=document_type or "Unknown",
        text=text,
    )

    response = client.chat.completions.create(
        model=model,
        temperature=temp,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _DEEP_ANALYSIS_SYSTEM},
            {"role": "user",   "content": prompt},
        ],
    )

    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


def _validate_severity(value: str, default: str = "MEDIUM") -> str:
    valid = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    v = str(value or "").upper().strip()
    return v if v in valid else default


def _safe_list(data: dict, key: str) -> list:
    v = data.get(key, [])
    return v if isinstance(v, list) else []


def run_deep_analysis(document) -> dict:
    """
    Run comprehensive LLM analysis on a document.

    Args:
        document: Document model instance (must have extracted_content).

    Returns:
        dict with all analysis fields, ready to save to DocumentDeepAnalysis.

    Falls back to empty-but-valid structure if LLM call fails or is unconfigured.
    """
    logger.info("run_deep_analysis started — document_id=%s", document.id)

    # Load extracted text
    try:
        extracted = document.extracted_content
        text = extracted.text.strip()
    except Exception:
        logger.warning("run_deep_analysis: no extracted content for doc %s", document.id)
        return _empty_result()

    if not text:
        return _empty_result()

    # Truncate to avoid token limits
    max_chars = min(getattr(settings, "AI_MAX_INPUT_CHARS", 12000), 10000)
    if len(text) > max_chars:
        text = text[:max_chars] + "\n[...document truncated for analysis]"

    document_type = getattr(document, "document_type", "UNKNOWN") or "UNKNOWN"

    api_key = getattr(settings, "LLM_API_KEY", "").strip()
    if not _is_valid_api_key(api_key):
        logger.warning("run_deep_analysis: no valid LLM_API_KEY — returning empty result")
        return _empty_result()

    try:
        data = _call_deep_analysis_llm(text, document_type)
    except Exception as exc:
        logger.error("run_deep_analysis: LLM call failed for doc %s: %s", document.id, exc)
        return _empty_result()

    # Validate and sanitize the response
    return {
        "summary":              str(data.get("summary", "") or ""),
        "key_information":      _safe_list(data, "key_information"),
        "important_dates":      _safe_list(data, "important_dates"),
        "entities":             _safe_list(data, "entities"),
        "amounts":              _safe_list(data, "amounts"),
        "missing_information":  _safe_list(data, "missing_information"),
        "inconsistencies":      _safe_list(data, "inconsistencies"),
        "risks":                _safe_list(data, "risks"),
        "overall_risk_level":   _validate_severity(data.get("overall_risk_level", "LOW"), "LOW"),
        "confidence_score":     max(0.0, min(1.0, float(data.get("confidence_score", 0.7) or 0.7))),
    }


def _empty_result() -> dict:
    return {
        "summary": "",
        "key_information": [],
        "important_dates": [],
        "entities": [],
        "amounts": [],
        "missing_information": [],
        "inconsistencies": [],
        "risks": [],
        "overall_risk_level": "LOW",
        "confidence_score": 0.0,
    }
