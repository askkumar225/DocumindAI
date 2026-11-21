from rest_framework import serializers
from .models import AIConversation, AIMessage


class AIMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AIMessage
        fields = ["id", "role", "content", "created_at"]
        read_only_fields = fields


class AIConversationSerializer(serializers.ModelSerializer):
    messages = AIMessageSerializer(many=True, read_only=True)

    class Meta:
        model  = AIConversation
        fields = ["id", "title", "messages", "created_at", "updated_at"]
        read_only_fields = fields


class AIConversationListSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model  = AIConversation
        fields = ["id", "title", "message_count", "created_at", "updated_at"]

    def get_message_count(self, obj) -> int:
        return obj.messages.count()


class AIChatRequestSerializer(serializers.Serializer):
    message         = serializers.CharField(max_length=4000)
    conversation_id = serializers.IntegerField(required=False, allow_null=True)


class AIChatResponseSerializer(serializers.Serializer):
    conversation_id = serializers.IntegerField()
    answer          = serializers.CharField()
    message_id      = serializers.IntegerField()
