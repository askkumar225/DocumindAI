"""
ai_app/services/streaming.py — SSE streaming helpers for General AI.

Owns:
  - The SSE event serialisation format
  - The generator that wraps the LLM stream and emits structured events
  - Persistence of the completed assistant message

All Django/ORM concerns stay in views.py.
All LLM concerns stay in llm.py.
This module is the glue between them.
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Generator

if TYPE_CHECKING:
    from ..models import AIConversation

logger = logging.getLogger(__name__)


# ─── SSE event helpers ────────────────────────────────────────────────────────

def sse(payload: dict) -> str:
    """Serialise a dict as a single SSE data line."""
    return f"data: {json.dumps(payload)}\n\n"


def sse_meta(conversation_id: int) -> str:
    return sse({"type": "meta", "conversation_id": conversation_id})


def sse_chunk(text: str) -> str:
    return sse({"type": "chunk", "text": text})


def sse_done(message_id: int) -> str:
    return sse({"type": "done", "message_id": message_id})


def sse_error(text: str) -> str:
    return sse({"type": "error", "text": text})


# ─── Main stream generator ────────────────────────────────────────────────────

def stream_conversation_response(
    conversation: "AIConversation",
    messages: list[dict],
) -> Generator[str, None, None]:
    """
    Yields SSE events for a full streaming chat response.

    Order of events:
      1. meta   — carries conversation_id so the client can associate the stream
      2. chunk* — one or more text chunks from the LLM
      3. done   — carries the persisted assistant message_id
      (or error if anything goes wrong)

    The assistant message is persisted to the DB after all chunks have been
    received, so the saved content is always the complete reply.
    """
    from ..models import AIMessage
    from .llm import stream_general_llm

    yield sse_meta(conversation.id)

    full_reply: list[str] = []

    try:
        for chunk in stream_general_llm(messages):
            full_reply.append(chunk)
            yield sse_chunk(chunk)

    except Exception as exc:
        logger.error("LLM streaming error for conv %s: %s", conversation.id, exc)
        yield sse_error("Stream error — please try again.")
        return

    # Persist the complete assistant reply
    complete = "".join(full_reply).strip()
    if not complete:
        yield sse_error("Empty response received from AI.")
        return

    ai_msg = AIMessage.objects.create(
        conversation=conversation,
        role=AIMessage.ROLE_ASSISTANT,
        content=complete,
    )

    yield sse_done(ai_msg.id)
