"""
General AI views.

POST  /api/ai/chat/                     — blocking chat (JSON response)
POST  /api/ai/chat/stream/              — streaming chat (SSE)
GET   /api/ai/conversations/            — list conversations
POST  /api/ai/conversations/            — create empty conversation
GET   /api/ai/conversations/{id}/       — full conversation with messages
PATCH /api/ai/conversations/{id}/       — rename
DELETE /api/ai/conversations/{id}/      — delete

Rate limiting
─────────────
Authenticated users are limited to:
  - AIChatThrottle     : 30 requests / minute
  - AIChatDayThrottle  : 200 requests / day
These are configurable in settings.py via DEFAULT_THROTTLE_RATES.
"""

import logging

from django.http import StreamingHttpResponse
from django.utils.text import Truncator
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import AIConversation, AIMessage
from .serializers import (
    AIChatRequestSerializer,
    AIConversationListSerializer,
    AIConversationSerializer,
)
from .services.context import build_context
from .services.llm import call_general_llm
from .services.streaming import stream_conversation_response

logger = logging.getLogger(__name__)


# ─── Throttle classes ─────────────────────────────────────────────────────────

class AIChatMinuteThrottle(UserRateThrottle):
    scope = "ai_chat_minute"


class AIChatDayThrottle(UserRateThrottle):
    scope = "ai_chat_day"


# ─── Shared helper ────────────────────────────────────────────────────────────

def _get_or_create_conversation(user, conv_id, first_message: str):
    """Return (conversation, error_response | None)."""
    if conv_id:
        try:
            return AIConversation.objects.get(id=conv_id, user=user), None
        except AIConversation.DoesNotExist:
            return None, Response({"error": "Conversation not found."}, status=404)

    conv = AIConversation.objects.create(
        user=user,
        title=Truncator(first_message).chars(60),
    )
    return conv, None


# ─── Blocking chat ────────────────────────────────────────────────────────────

class AIChatView(APIView):
    """POST /api/ai/chat/ — full JSON response (no streaming)."""
    permission_classes = [IsAuthenticated]
    throttle_classes   = [AIChatMinuteThrottle, AIChatDayThrottle]

    def post(self, request):
        ser = AIChatRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        message = ser.validated_data["message"].strip()
        conv_id = ser.validated_data.get("conversation_id")

        conv, err = _get_or_create_conversation(request.user, conv_id, message)
        if err:
            return err

        # Persist user message
        AIMessage.objects.create(
            conversation=conv, role=AIMessage.ROLE_USER, content=message
        )

        # Build context and call LLM
        messages = build_context(conv, message)
        try:
            answer = call_general_llm(messages)
        except Exception as exc:
            logger.error("AIChatView: unexpected LLM error: %s", exc, exc_info=True)
            answer = "⚠️ Something went wrong generating a response. Please try again."

        # Persist assistant reply
        ai_msg = AIMessage.objects.create(
            conversation=conv, role=AIMessage.ROLE_ASSISTANT, content=answer
        )

        # Auto-title after first exchange
        if conv.messages.count() <= 2:
            conv.title = Truncator(message).chars(60)
            conv.save(update_fields=["title", "updated_at"])

        return Response({
            "conversation_id": conv.id,
            "answer":          answer,
            "message_id":      ai_msg.id,
        })


# ─── Streaming chat (SSE) ─────────────────────────────────────────────────────

class AIChatStreamView(APIView):
    """
    POST /api/ai/chat/stream/ — streaming SSE response.

    SSE event sequence:
      data: {"type": "meta",  "conversation_id": 12}
      data: {"type": "chunk", "text": "Hello"}
      data: {"type": "chunk", "text": " world"}
      data: {"type": "done",  "message_id": 55}
    """
    permission_classes = [IsAuthenticated]
    throttle_classes   = [AIChatMinuteThrottle, AIChatDayThrottle]

    def post(self, request):
        ser = AIChatRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        message = ser.validated_data["message"].strip()
        conv_id = ser.validated_data.get("conversation_id")

        conv, err = _get_or_create_conversation(request.user, conv_id, message)
        if err:
            from .services.streaming import sse_error  # noqa: PLC0415
            return StreamingHttpResponse(
                iter([sse_error("Conversation not found.")]),
                content_type="text/event-stream",
                status=404,
            )

        # Persist user message immediately so the client can optimistically render
        AIMessage.objects.create(
            conversation=conv, role=AIMessage.ROLE_USER, content=message
        )

        # Auto-title on first message
        if conv.messages.count() <= 1:
            conv.title = Truncator(message).chars(60)
            conv.save(update_fields=["title", "updated_at"])

        # Build context AFTER saving the user message so it is included
        messages = build_context(conv, message)

        # stream_conversation_response handles LLM streaming + DB persistence
        response = StreamingHttpResponse(
            stream_conversation_response(conv, messages),
            content_type="text/event-stream",
        )
        response["Cache-Control"]      = "no-cache"
        response["X-Accel-Buffering"]  = "no"
        return response


# ─── Conversation CRUD ────────────────────────────────────────────────────────

class AIConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        convs = AIConversation.objects.filter(user=request.user)
        return Response(AIConversationListSerializer(convs, many=True).data)

    def post(self, request):
        title = (request.data.get("title") or "New Conversation").strip()
        conv  = AIConversation.objects.create(user=request.user, title=title)
        return Response(AIConversationSerializer(conv).data, status=201)


class AIConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        try:
            return AIConversation.objects.prefetch_related("messages").get(
                pk=pk, user=user
            )
        except AIConversation.DoesNotExist:
            return None

    def get(self, request, pk):
        conv = self._get(pk, request.user)
        if not conv:
            return Response({"error": "Not found."}, status=404)
        return Response(AIConversationSerializer(conv).data)

    def patch(self, request, pk):
        conv = self._get(pk, request.user)
        if not conv:
            return Response({"error": "Not found."}, status=404)
        title = (request.data.get("title") or "").strip()
        if title:
            conv.title = title
            conv.save(update_fields=["title", "updated_at"])
        return Response(AIConversationSerializer(conv).data)

    def delete(self, request, pk):
        conv = self._get(pk, request.user)
        if not conv:
            return Response({"error": "Not found."}, status=404)
        conv.delete()
        return Response(status=204)


# ─── Regenerate last AI response ──────────────────────────────────────────────

class AIRegenerateView(APIView):
    """
    POST /api/ai/conversations/{id}/regenerate/

    Re-generate the most recent assistant message in a conversation.

    Flow:
      1. Load the conversation (must belong to the requesting user).
      2. Find the last user message.
      3. Delete the last assistant message (if one exists and is the final message).
      4. Re-send the last user message to the LLM using existing conversation context.
      5. Persist the new assistant reply.
      6. Return the new message.

    Returns 400 when there is no user message to regenerate from.
    Returns 404 when the conversation is not found.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes   = [AIChatMinuteThrottle, AIChatDayThrottle]

    def post(self, request, pk):
        try:
            conv = AIConversation.objects.prefetch_related(
                "messages"
            ).get(pk=pk, user=request.user)
        except AIConversation.DoesNotExist:
            return Response({"error": "Conversation not found."}, status=404)

        # Find the messages in order
        messages_qs = conv.messages.order_by("created_at")
        all_messages = list(messages_qs)

        if not all_messages:
            return Response(
                {"error": "No messages in this conversation to regenerate."},
                status=400,
            )

        # Find the last user message
        last_user_msg = next(
            (m for m in reversed(all_messages) if m.role == AIMessage.ROLE_USER),
            None,
        )
        if not last_user_msg:
            return Response(
                {"error": "No user message found to regenerate from."},
                status=400,
            )

        # Remove the last assistant message if it is the final message
        last_msg = all_messages[-1]
        if last_msg.role == AIMessage.ROLE_ASSISTANT:
            last_msg.delete()
            logger.info(
                "Regenerate: deleted last assistant message %s in conv %s",
                last_msg.id, conv.id,
            )

        # Build context (excluding the just-deleted assistant message)
        messages_payload = build_context(conv, last_user_msg.content)
        answer = call_general_llm(messages_payload)

        # Persist new assistant reply
        new_msg = AIMessage.objects.create(
            conversation=conv,
            role=AIMessage.ROLE_ASSISTANT,
            content=answer,
        )

        conv.save(update_fields=["updated_at"])

        logger.info(
            "Regenerate: new message %s for conv %s", new_msg.id, conv.id
        )

        return Response({
            "conversation_id": conv.id,
            "message_id":      new_msg.id,
            "answer":          answer,
        })
