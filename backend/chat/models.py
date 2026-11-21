"""
Chat models for DocuMind AI — Universal Document Chat.

Two models:
    Conversation  — a named chat session belonging to a user
    Message       — a single turn (user question or AI answer) in a conversation

Design decisions:
    - A conversation can reference multiple documents (ManyToMany)
      enabling cross-document RAG queries.
    - Each AI message stores its citations as JSON so they're
      retrievable without a separate query.
    - Conversation titles are auto-generated from the first user message
      if not explicitly named.
"""

from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """
    A named chat session.

    A user can have many conversations, each optionally scoped to
    one or more documents.  When documents is empty the chat falls
    back to general AI (no RAG retrieval).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations",
    )

    title = models.CharField(
        max_length=255,
        blank=True,
        default="New Conversation",
    )

    # Documents in scope for this conversation.
    # Empty = search all user's accessible documents.
    documents = models.ManyToManyField(
        "documents.Document",
        blank=True,
        related_name="conversations",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"[{self.user.username}] {self.title}"


class Message(models.Model):
    """
    A single message turn in a conversation.

    role:
        "user"      — question from the authenticated user
        "assistant" — answer from the LLM

    citations:
        JSON list of citation objects, populated for assistant messages.
        Each citation:
            {
                "document_id":    int,
                "document_title": str,
                "page_number":    int | null,
                "chunk_index":    int,
                "content":        str   (the matched passage)
            }

    sources_found:
        True if relevant document chunks were retrieved.
        False means the answer is a "not found" response.
    """

    ROLE_USER = "user"
    ROLE_ASSISTANT = "assistant"

    ROLE_CHOICES = [
        (ROLE_USER, "User"),
        (ROLE_ASSISTANT, "Assistant"),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    content = models.TextField()

    # Citations — only populated for assistant messages
    citations = models.JSONField(default=list, blank=True)

    # False = answer was "I couldn't find this information"
    sources_found = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        preview = self.content[:60] + "…" if len(self.content) > 60 else self.content
        return f"[{self.role}] {preview}"


# ─── AIActionLog ───────────────────────────────────────────────────────────────

class AIActionLog(models.Model):
    """
    Records every AI action command executed through the chat interface.

    Provides full auditability of who asked what, which tool ran,
    whether it succeeded, and what the LLM-detected intent was.

    action_type matches ACTION_TYPES constants in intent_router.py:
        CHAT, SUMMARIZE, EXTRACT, SEARCH, COMPARE,
        FIND_RISKS, FIND_MISSING, FIND_EXPIRING,
        FIND_PENDING_APPROVALS, EXPLAIN
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ai_action_logs",
    )

    action_type = models.CharField(
        max_length=50,
        db_index=True,
    )

    query = models.TextField(
        help_text="The original user message that triggered this action.",
    )

    # Structured parameters extracted from the query
    # e.g. {"document_type": "CONTRACT", "risk_level": "HIGH"}
    parameters = models.JSONField(default=dict, blank=True)

    # Structured result metadata (not the full payload — just counts/summary)
    # e.g. {"result_count": 3, "documents": [1, 2, 3]}
    result_meta = models.JSONField(default=dict, blank=True)

    success = models.BooleanField(default=True)

    error_message = models.TextField(blank=True)

    # How long the action took in milliseconds
    duration_ms = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["action_type", "-created_at"]),
        ]
        verbose_name = "AI Action Log"
        verbose_name_plural = "AI Action Logs"

    def __str__(self):
        username = self.user.username if self.user else "anonymous"
        return f"[{self.action_type}] {username}: {self.query[:60]}"
