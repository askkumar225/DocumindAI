"""
Serializers for the chat app.
"""

from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            "id",
            "role",
            "content",
            "citations",
            "sources_found",
            "created_at",
        ]
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    document_ids = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "title",
            "document_ids",
            "messages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_document_ids(self, obj) -> list[int]:
        return list(obj.documents.values_list("id", flat=True))


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the sidebar list — no messages."""
    message_count = serializers.SerializerMethodField()
    document_ids = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "title",
            "message_count",
            "document_ids",
            "created_at",
            "updated_at",
        ]

    def get_message_count(self, obj) -> int:
        return obj.messages.count()

    def get_document_ids(self, obj) -> list[int]:
        return list(obj.documents.values_list("id", flat=True))


class ChatRequestSerializer(serializers.Serializer):
    """Payload for POST /api/chat/"""
    conversation_id = serializers.IntegerField(required=False, allow_null=True)
    question        = serializers.CharField(max_length=2000)
    document_ids    = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        default=list,
    )


class ChatResponseSerializer(serializers.Serializer):
    """Response shape for POST /api/chat/"""
    conversation_id = serializers.IntegerField()
    answer          = serializers.CharField()
    citations       = serializers.ListField(child=serializers.DictField())
    sources_found   = serializers.BooleanField()
    message_id      = serializers.IntegerField()
