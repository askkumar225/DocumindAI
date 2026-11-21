"""
ai_app/services/context.py — Conversation context builder for General AI.

Responsible for:
  - Selecting which messages to include in the LLM context window
  - Enforcing token-budget limits (character-based approximation)
  - Injecting the system prompt

Strategy
--------
Short conversations  (<= MAX_RECENT_TURNS)
    → send all messages as-is

Long conversations   (> MAX_RECENT_TURNS)
    → keep the most recent MAX_RECENT_TURNS turns
    → prepend a brief summary note so the model is aware history was trimmed
    (Full summarisation via LLM is a future enhancement)
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from .prompts import GENERAL_AI_SYSTEM

if TYPE_CHECKING:
    from ..models import AIConversation

logger = logging.getLogger(__name__)

# ─── Tunables ─────────────────────────────────────────────────────────────────

MAX_RECENT_TURNS   = 20      # number of (user + assistant) message pairs to keep
MAX_CHARS_PER_MSG  = 4_000   # truncate any single message beyond this
MAX_CONTEXT_CHARS  = 40_000  # hard ceiling on total context characters sent to LLM


# ─── Public API ──────────────────────────────────────────────────────────────

def build_context(
    conversation: "AIConversation",
    new_user_message: str,
) -> list[dict]:
    """
    Return the full messages list ready to send to the LLM, including:
      - system prompt
      - trimmed conversation history
      - the new user message

    Parameters
    ----------
    conversation : AIConversation
        The conversation object (messages must be accessible via .messages).
    new_user_message : str
        The latest user input (not yet saved to DB when this is called).
    """
    # Fetch persisted history (excluding any unsaved messages)
    history = list(
        conversation.messages
        .order_by("created_at")
        .values("role", "content")
    )

    # Trim to recent turns
    if len(history) > MAX_RECENT_TURNS:
        trimmed_count = len(history) - MAX_RECENT_TURNS
        history = history[-MAX_RECENT_TURNS:]
        logger.debug(
            "Context trimmed: dropped %d older messages for conv %s",
            trimmed_count, conversation.id,
        )

    # Build messages payload
    messages: list[dict] = [{"role": "system", "content": GENERAL_AI_SYSTEM}]

    total_chars = len(GENERAL_AI_SYSTEM)

    for msg in history:
        content = _truncate(msg["content"], MAX_CHARS_PER_MSG)
        total_chars += len(content)
        if total_chars > MAX_CONTEXT_CHARS:
            logger.debug("Context hard-cap reached, stopping history inclusion.")
            break
        messages.append({"role": msg["role"], "content": content})

    # Append the new message
    messages.append({
        "role": "user",
        "content": _truncate(new_user_message, MAX_CHARS_PER_MSG),
    })

    return messages


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n…[truncated]"
