"""
Action Executor for DocuMind AI — Command Center.

Receives an IntentResult, routes it to the correct tool,
logs the action, and returns a structured ActionResult.

Architecture:
    IntentResult
         ↓
    ActionExecutor.execute()
         ↓
    ┌────────────────────────────┐
    │  Permission check          │
    │  Tool dispatch             │
    │  Response builder          │
    │  AIActionLog.save()        │
    └────────────────────────────┘
         ↓
    ActionResult(type, data, message, needs_confirmation)

Security:
    - Every tool is responsible for its own permission scoping
    - Destructive actions (approve, delete, reject) set needs_confirmation=True
      and are NOT executed until the frontend confirms
    - action_executor never touches the DB directly — delegates to tools
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ─── Action result ─────────────────────────────────────────────────────────────

@dataclass
class ActionResult:
    """
    Structured result returned to the chat view.

    Fields:
        action_type         — mirrors the IntentResult.action_type
        data                — tool payload (documents list, summary dict, etc.)
        message             — human-readable AI response text
        needs_confirmation  — True for destructive/mutating operations
        confirmation_prompt — shown to user before confirming
        error               — non-None if something failed
        redirect            — optional frontend route to navigate to
        result_type         — UI hint: "documents" | "risks" | "approvals" |
                              "summary" | "extraction" | "comparison" |
                              "table" | "text" | "error"
    """
    action_type:          str  = "CHAT"
    data:                 dict = field(default_factory=dict)
    message:              str  = ""
    needs_confirmation:   bool = False
    confirmation_prompt:  str  = ""
    error:                str  = ""
    redirect:             str  = ""
    result_type:          str  = "text"


# ─── Tool registry ─────────────────────────────────────────────────────────────

def _load_tools():
    from chat.services.tools import (
        search_tool, summary_tool, risk_tool,
        approval_tool, comparison_tool, extraction_tool,
    )
    return {
        "search_tool":     search_tool,
        "summary_tool":    summary_tool,
        "risk_tool":       risk_tool,
        "approval_tool":   approval_tool,
        "comparison_tool": comparison_tool,
        "extraction_tool": extraction_tool,
    }


# ─── Message builders ──────────────────────────────────────────────────────────

def _search_message(data: dict, params: dict) -> str:
    count = data.get("count", 0)
    filt  = data.get("filter_summary", "")
    if count == 0:
        return f"I couldn't find any documents matching '{filt}'. Try uploading some first."
    return f"I found **{count}** document{'s' if count != 1 else ''}" + (f" ({filt})" if filt else "") + "."


def _risk_message(data: dict, params: dict) -> str:
    count = data.get("count", 0)
    level = data.get("risk_level", "HIGH")
    if count == 0:
        return f"No {level.lower()}-risk documents found in your workspace."
    return f"I found **{count}** document{'s' if count != 1 else ''} with **{level}** risk issues."


def _approval_message(data: dict, params: dict) -> str:
    count  = data.get("count", 0)
    status = data.get("status", "PENDING")
    if count == 0:
        return f"You have no {status.lower()} approval requests right now."
    return f"You have **{count}** {status.lower()} approval request{'s' if count != 1 else ''}."


def _summary_message(data: dict) -> str:
    title = data.get("document_title", "this document")
    if data.get("error"):
        return data["error"]
    return f"Here's the AI summary for **{title}**:"


def _extraction_message(data: dict, params: dict) -> str:
    if data.get("error"):
        return data["error"]
    count = data.get("count", 0)
    etype = data.get("extract_type", "data")
    title = data.get("document_title", "the document")
    if count == 0:
        return f"No {etype} found in '{title}'."
    return f"I extracted **{count}** {etype} item{'s' if count != 1 else ''} from **{title}**:"


def _comparison_message(data: dict) -> str:
    if data.get("error"):
        return data["error"]
    title = data.get("title", "documents")
    return (
        f"I've started a comparison for **{title}**. "
        f"The analysis is running — you can view results at the link below."
    )


def _explain_message(question: str) -> str:
    return ""  # LLM will handle explanation directly — falls through to RAG


# ─── Main executor ─────────────────────────────────────────────────────────────

class ActionExecutor:
    """
    Routes an IntentResult to the appropriate tool and returns ActionResult.
    """

    def execute(self, user, intent, document_ids: list[int] | None = None) -> ActionResult:
        """
        Execute an AI action.

        Args:
            user         — authenticated Django user
            intent       — IntentResult from intent_router.classify_intent()
            document_ids — documents currently in scope (from conversation context)

        Returns:
            ActionResult
        """
        from chat.services.intent_router import (
            CHAT, SUMMARIZE, EXTRACT, SEARCH, COMPARE,
            FIND_RISKS, FIND_MISSING, FIND_EXPIRING,
            FIND_PENDING_APPROVALS, EXPLAIN,
        )

        action_type = intent.action_type
        params      = dict(intent.parameters)

        # Inject document context
        if document_ids:
            if len(document_ids) == 1 and "document_id" not in params:
                params["document_id"] = document_ids[0]
            if len(document_ids) >= 2 and "document_ids" not in params:
                params["document_ids"] = document_ids

        start_ms = int(time.time() * 1000)
        result   = ActionResult(action_type=action_type)

        try:
            # ── CHAT / EXPLAIN → fall through to RAG ──────────────────────────
            if action_type in (CHAT, EXPLAIN):
                result.action_type  = action_type
                result.result_type  = "text"
                result.message      = ""   # will be filled by RAG pipeline
                return result

            tools = _load_tools()

            # ── SUMMARIZE ─────────────────────────────────────────────────────
            if action_type == SUMMARIZE:
                data = tools["summary_tool"].run(user, params)
                result.data        = data
                result.result_type = "summary"
                result.message     = _summary_message(data)
                if data.get("error"):
                    result.result_type = "text"
                    result.message     = data["error"]
                    result.error       = data["error"]

            # ── EXTRACT ───────────────────────────────────────────────────────
            elif action_type == EXTRACT:
                # Infer extract_type from original message
                params.setdefault("extract_type", _infer_extract_type(intent.raw_message))
                data = tools["extraction_tool"].run(user, params)
                result.data        = data
                result.result_type = "extraction"
                result.message     = _extraction_message(data, params)
                if data.get("error"):
                    result.result_type = "text"
                    result.error       = data["error"]

            # ── SEARCH ────────────────────────────────────────────────────────
            elif action_type == SEARCH:
                data = tools["search_tool"].run(user, params)
                result.data        = data
                result.result_type = "documents"
                result.message     = _search_message(data, params)

            # ── FIND_RISKS ────────────────────────────────────────────────────
            elif action_type == FIND_RISKS:
                params.setdefault("risk_level", "HIGH")
                data = tools["risk_tool"].run(user, params)
                result.data        = data
                result.result_type = "risks"
                result.message     = _risk_message(data, params)

            # ── FIND_MISSING ──────────────────────────────────────────────────
            elif action_type == FIND_MISSING:
                params["extract_type"] = "missing"
                data = tools["extraction_tool"].run(user, params)
                result.data        = data
                result.result_type = "extraction"
                result.message     = _extraction_message(data, params)

            # ── FIND_EXPIRING ─────────────────────────────────────────────────
            elif action_type == FIND_EXPIRING:
                params.setdefault("filter_type", "date")
                params["expiring_soon"] = True
                data = tools["search_tool"].run(user, params)
                result.data        = data
                result.result_type = "documents"
                count = data.get("count", 0)
                result.message = (
                    f"I found **{count}** document{'s' if count != 1 else ''} with upcoming expiry dates."
                    if count > 0 else
                    "No documents with upcoming expiry dates found."
                )

            # ── FIND_PENDING_APPROVALS ─────────────────────────────────────────
            elif action_type == FIND_PENDING_APPROVALS:
                params.setdefault("status", "PENDING")
                data = tools["approval_tool"].run(user, params)
                result.data        = data
                result.result_type = "approvals"
                result.message     = _approval_message(data, params)

            # ── COMPARE ───────────────────────────────────────────────────────
            elif action_type == COMPARE:
                data = tools["comparison_tool"].run(user, params)
                result.data        = data
                result.result_type = "comparison"
                result.message     = _comparison_message(data)
                if data.get("redirect"):
                    result.redirect = data["redirect"]
                if data.get("error"):
                    result.result_type = "text"
                    result.error       = data["error"]

            else:
                # Unknown → fall through to RAG
                result.result_type = "text"
                result.message     = ""

        except Exception as exc:
            logger.error("ActionExecutor failed for %s: %s", action_type, exc, exc_info=True)
            result.error       = "I couldn't complete that request. Please try again."
            result.result_type = "text"
            result.message     = result.error

        finally:
            duration_ms = int(time.time() * 1000) - start_ms
            _log_action(
                user        = user,
                action_type = action_type,
                query       = intent.raw_message,
                params      = params,
                result      = result,
                duration_ms = duration_ms,
            )

        return result


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _infer_extract_type(message: str) -> str:
    m = message.lower()
    if "date"   in m: return "dates"
    if "amount" in m or "value" in m or "price" in m or "cost" in m: return "amounts"
    if "name"   in m or "compan" in m or "part"  in m: return "entities"
    if "risk"   in m: return "risks"
    if "miss"   in m: return "missing"
    return "key_info"


def _log_action(user, action_type: str, query: str, params: dict,
                result: ActionResult, duration_ms: int) -> None:
    try:
        from chat.models import AIActionLog
        AIActionLog.objects.create(
            user        = user,
            action_type = action_type,
            query       = query[:2000],
            parameters  = params,
            result_meta = {
                "result_type": result.result_type,
                "count":       result.data.get("count") if result.data else None,
                "has_error":   bool(result.error),
            },
            success       = not bool(result.error),
            error_message = result.error[:500] if result.error else "",
            duration_ms   = duration_ms,
        )
    except Exception as exc:
        logger.error("Failed to save AIActionLog: %s", exc)


# ─── Singleton ─────────────────────────────────────────────────────────────────

executor = ActionExecutor()
