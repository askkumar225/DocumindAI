"""
Intent Router for DocuMind AI — AI Command Center.

Classifies user messages into one of the ACTION_TYPES and extracts
structured parameters from natural language.

Architecture:
    User message
         ↓
    Intent Router (LLM-based classification)
         ↓
    IntentResult(action_type, parameters, confidence)
         ↓
    Action Executor → Tool → Result

Two strategies:
    1. Keyword/pattern matching  — fast, zero LLM cost, handles obvious cases
    2. LLM classification        — fallback for ambiguous messages, uses
                                   a cheap single-call classification prompt

If neither LLM key nor pattern matches → returns CHAT (plain RAG fallback).
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

# ─── Action type constants ─────────────────────────────────────────────────────

CHAT                   = "CHAT"
SUMMARIZE              = "SUMMARIZE"
EXTRACT                = "EXTRACT"
SEARCH                 = "SEARCH"
COMPARE                = "COMPARE"
FIND_RISKS             = "FIND_RISKS"
FIND_MISSING           = "FIND_MISSING"
FIND_EXPIRING          = "FIND_EXPIRING"
FIND_PENDING_APPROVALS = "FIND_PENDING_APPROVALS"
EXPLAIN                = "EXPLAIN"

ACTION_TYPES = [
    CHAT, SUMMARIZE, EXTRACT, SEARCH, COMPARE,
    FIND_RISKS, FIND_MISSING, FIND_EXPIRING,
    FIND_PENDING_APPROVALS, EXPLAIN,
]

# ─── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class IntentResult:
    action_type: str = CHAT
    parameters:  dict = field(default_factory=dict)
    confidence:  float = 1.0
    raw_message: str = ""


# ─── Keyword patterns ──────────────────────────────────────────────────────────
# Each entry: (regex_pattern, action_type, param_extractor_fn_or_none)

def _doc_type_from_text(text: str) -> str | None:
    t = text.lower()
    if "contract"       in t: return "CONTRACT"
    if "invoice"        in t: return "INVOICE"
    if "purchase order" in t or "po "  in t: return "PURCHASE_ORDER"
    if "receipt"        in t: return "RECEIPT"
    if "report"         in t: return "REPORT"
    if "policy"         in t: return "POLICY"
    return None

def _risk_level_from_text(text: str) -> str | None:
    t = text.lower()
    if "critical"  in t: return "CRITICAL"
    if "high risk" in t or "high-risk" in t or "high" in t: return "HIGH"
    if "medium"    in t: return "MEDIUM"
    if "low"       in t: return "LOW"
    return None


_KEYWORD_RULES: list[tuple[str, str, dict]] = [
    # SUMMARIZE
    (r"\b(summar|overview|briefly describe|tldr|key points)\b",
     SUMMARIZE, {}),

    # EXTRACT
    (r"\b(extract|pull out|list all|get all|find all)\b.*(date|amount|name|number|term|entit|party|parties)",
     EXTRACT, {}),

    # FIND_RISKS
    (r"\b(risk|risky|dangerous|issue|problem|concern|liability|unlimited|auto.?renew)\b",
     FIND_RISKS, {}),

    # FIND_MISSING
    (r"\b(missing|absent|not found|incomplete|lacks|without)\b.*(info|field|data|section|signator)",
     FIND_MISSING, {}),

    # FIND_EXPIRING
    (r"\b(expir|expire|expiry|expiring|due soon|deadline|renew)\b",
     FIND_EXPIRING, {}),

    # FIND_PENDING_APPROVALS
    (r"\b(pending approval|need.*(my approval|approve)|review queue|awaiting approval|assigned to me)\b",
     FIND_PENDING_APPROVALS, {}),

    # COMPARE
    (r"\b(compar|vs\.?|versus|differ|match|mismatch|same as)\b",
     COMPARE, {}),

    # EXPLAIN
    (r"\b(explain|what does|meaning of|define|what is|clarify|simplify|in simple)\b",
     EXPLAIN, {}),

    # SEARCH — document type/status queries
    (r"\b(show|find|list|get|display|search)\b.*(document|contract|invoice|po|report|policy|receipt)",
     SEARCH, {}),

    # SEARCH — amount queries
    (r"\b(above|below|more than|less than|over|under|between|highest|largest|biggest)\b.*[₹$£€\d,]+",
     SEARCH, {"filter_type": "amount"}),
]


# ─── Pattern-based fast router ─────────────────────────────────────────────────

def _pattern_route(message: str) -> IntentResult | None:
    """
    Fast keyword/regex classification. Returns None if no pattern matches.
    """
    lower = message.lower()

    for pattern, action, extra_params in _KEYWORD_RULES:
        if re.search(pattern, lower):
            params: dict[str, Any] = dict(extra_params)

            # Extract document type if mentioned
            doc_type = _doc_type_from_text(lower)
            if doc_type:
                params["document_type"] = doc_type

            # Extract risk level if mentioned
            risk = _risk_level_from_text(lower)
            if risk and action in (FIND_RISKS, SEARCH):
                params["risk_level"] = risk

            # Extract amount filters
            amount_match = re.search(r"[₹$£€]?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:lakh|lakhs|k|thousand)?", lower)
            if amount_match and action == SEARCH:
                raw = amount_match.group(1).replace(",", "")
                try:
                    val = float(raw)
                    # Handle "lakh" (100000) and "k" (1000)
                    if "lakh" in lower: val *= 100_000
                    elif " k" in lower: val *= 1_000
                    if re.search(r"\b(above|more than|over|greater)\b", lower):
                        params["amount_min"] = val
                    elif re.search(r"\b(below|less than|under)\b", lower):
                        params["amount_max"] = val
                except ValueError:
                    pass

            logger.debug("Pattern matched: %s → %s %s", pattern[:30], action, params)
            return IntentResult(action_type=action, parameters=params, confidence=0.85,
                                raw_message=message)

    return None


# ─── LLM-based classifier ──────────────────────────────────────────────────────

_CLASSIFY_SYSTEM = """You are a command classifier for DocuMind AI, a document management system.
Classify the user's message into exactly ONE of these action types and return JSON only:

CHAT                   — general Q&A about document content (default)
SUMMARIZE              — user wants a summary of a document
EXTRACT                — user wants to extract specific data (dates, amounts, names, etc.)
SEARCH                 — user wants to find/list/filter documents
COMPARE                — user wants to compare 2+ documents
FIND_RISKS             — user wants to find risky documents or risk items
FIND_MISSING           — user wants to find missing information in documents
FIND_EXPIRING          — user wants to find documents expiring soon
FIND_PENDING_APPROVALS — user wants pending approval tasks
EXPLAIN                — user wants an explanation of a term or clause

Return this JSON exactly:
{
  "action_type": "ONE_OF_THE_ABOVE",
  "document_type": "CONTRACT|INVOICE|PURCHASE_ORDER|RECEIPT|REPORT|POLICY|null",
  "risk_level": "CRITICAL|HIGH|MEDIUM|LOW|null",
  "filter_type": "amount|date|status|null",
  "confidence": 0.0_to_1.0
}"""


def _llm_route(message: str) -> IntentResult:
    """
    LLM-based classification fallback. Returns CHAT on any failure.
    """
    api_key = getattr(settings, "LLM_API_KEY", "")
    if not api_key:
        return IntentResult(action_type=CHAT, confidence=0.5, raw_message=message)

    try:
        from openai import OpenAI
        import json as _json

        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
            temperature=0.0,
            max_tokens=120,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _CLASSIFY_SYSTEM},
                {"role": "user",   "content": f"User message: {message}"},
            ],
        )
        data = _json.loads(response.choices[0].message.content or "{}")
        action = str(data.get("action_type", CHAT)).upper()
        if action not in ACTION_TYPES:
            action = CHAT

        params = {}
        if data.get("document_type") and data["document_type"] != "null":
            params["document_type"] = data["document_type"]
        if data.get("risk_level") and data["risk_level"] != "null":
            params["risk_level"] = data["risk_level"]
        if data.get("filter_type") and data["filter_type"] != "null":
            params["filter_type"] = data["filter_type"]

        return IntentResult(
            action_type=action,
            parameters=params,
            confidence=float(data.get("confidence", 0.7)),
            raw_message=message,
        )

    except Exception as exc:
        logger.warning("LLM intent classification failed: %s — falling back to CHAT", exc)
        return IntentResult(action_type=CHAT, confidence=0.5, raw_message=message)


# ─── Public entry point ────────────────────────────────────────────────────────

def classify_intent(message: str) -> IntentResult:
    """
    Classify the user's message into an IntentResult.

    Strategy:
        1. Try fast pattern matching (no LLM cost)
        2. If no pattern match → use LLM classifier
        3. If LLM unavailable → default to CHAT

    Args:
        message: The raw user message string.

    Returns:
        IntentResult with action_type, parameters, confidence.
    """
    if not message or not message.strip():
        return IntentResult(action_type=CHAT, raw_message=message)

    # Fast path
    result = _pattern_route(message)
    if result:
        return result

    # LLM fallback
    return _llm_route(message)
