"""
ai_app/services/llm.py — Low-level LLM client wrapper.

Responsibilities:
  - Build/cache the OpenAI client
  - Blocking call  → call_general_llm()
  - Streaming call → stream_general_llm()

Does NOT own prompt text (see prompts.py) or context building (see context.py).
"""

import logging
from typing import Generator

from django.conf import settings

from .prompts import GENERAL_AI_SYSTEM

logger = logging.getLogger(__name__)


# ─── Error classifier ─────────────────────────────────────────────────────────

def _classify_error(exc: Exception) -> str:
    """Map provider exceptions to user-friendly messages without leaking details."""
    msg = str(exc).lower()
    logger.error("LLM provider error: %s", exc)

    if "401" in msg or "authentication" in msg or "invalid api key" in msg or "incorrect api key" in msg:
        return (
            "❌ **Invalid API key.**\n\n"
            "The AI service could not authenticate. "
            "Please check that `LLM_API_KEY` in `backend/.env` is correct."
        )
    if "429" in msg or "rate limit" in msg or "quota" in msg:
        return (
            "⏳ **Rate limit reached.**\n\n"
            "The AI service is temporarily busy. Please wait a moment and try again."
        )
    if "timeout" in msg or "timed out" in msg:
        return (
            "⌛ **Request timed out.**\n\n"
            "The AI service took too long to respond. Please try again."
        )
    if "connection" in msg or "network" in msg or "unreachable" in msg:
        return (
            "🌐 **Connection error.**\n\n"
            "Unable to reach the AI service. Please check your network and try again."
        )
    if "model" in msg and ("not found" in msg or "does not exist" in msg):
        return (
            "❌ **Model not found.**\n\n"
            "The model specified in `LLM_MODEL` is not available. "
            "Check the model name in `backend/.env`."
        )
    return (
        "⚠️ **Something went wrong.**\n\n"
        "The AI service returned an unexpected error. Please try again later."
    )


# ─── Client factory ───────────────────────────────────────────────────────────

_PLACEHOLDER_VALUES = {
    "your_openai_api_key_here",
    "your_api_key_here",
    "sk-...",
    "YOUR_API_KEY",
    "",
}

def _is_valid_key(key: str) -> bool:
    """Return True only when the key looks like a real credential."""
    stripped = key.strip()
    if not stripped:
        return False
    if stripped in _PLACEHOLDER_VALUES:
        return False
    # OpenAI keys start with "sk-"
    # Accept any non-placeholder non-empty string so other providers work too
    return True


def _get_client():
    """Return (OpenAI client, model name) or (None, None) if not configured."""
    api_key = getattr(settings, "LLM_API_KEY", "").strip()

    if not _is_valid_key(api_key):
        logger.warning(
            "LLM_API_KEY is missing or still set to a placeholder value. "
            "Set a real API key in backend/.env."
        )
        return None, None

    try:
        from openai import OpenAI          # noqa: PLC0415
        client = OpenAI(api_key=api_key)
        model  = getattr(settings, "LLM_MODEL", "gpt-4o-mini").strip()
        logger.debug("OpenAI client initialised (model=%s)", model)
        return client, model
    except Exception as exc:
        logger.error("OpenAI client init failed: %s", exc)
        return None, None


_NO_KEY_MESSAGE = (
    "⚠️ **AI service not configured.**\n\n"
    "To enable real AI responses, open `backend/.env` and replace the placeholder:\n\n"
    "```\nLLM_API_KEY=sk-your-real-openai-key-here\n```\n\n"
    "Get your key at https://platform.openai.com/api-keys"
)


# ─── Blocking call ────────────────────────────────────────────────────────────

def call_general_llm(messages: list[dict], max_tokens: int = 1500) -> str:
    """
    Blocking LLM call.

    Parameters
    ----------
    messages : list[dict]
        Full messages list INCLUDING the system prompt as the first element.
    max_tokens : int
        Maximum response tokens.

    Returns
    -------
    str  — the assistant's reply (or a fallback message on error).
    """
    client, model = _get_client()

    if not client:
        return _NO_KEY_MESSAGE

    try:
        response = client.chat.completions.create(
            model=model,
            temperature=0.4,
            max_tokens=max_tokens,
            messages=messages,
        )
        return (response.choices[0].message.content or "").strip()

    except Exception as exc:
        return _classify_error(exc)


# ─── Streaming call ───────────────────────────────────────────────────────────

def stream_general_llm(
    messages: list[dict],
    max_tokens: int = 1500,
) -> Generator[str, None, None]:
    """
    Streaming LLM call.

    Parameters
    ----------
    messages : list[dict]
        Full messages list INCLUDING the system prompt as the first element.

    Yields
    ------
    str — text chunks as they arrive from the provider.
    """
    client, model = _get_client()

    if not client:
        yield _NO_KEY_MESSAGE
        return

    try:
        stream = client.chat.completions.create(
            model=model,
            temperature=0.4,
            max_tokens=max_tokens,
            messages=messages,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    except Exception as exc:
        logger.error("LLM streaming error: %s", exc)
        yield f"\n\n{_classify_error(exc)}"
