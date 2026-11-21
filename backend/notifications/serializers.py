"""
Serializers for the notifications app — Day 6.
"""

from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Read serializer for Notification.

    The `document_title` and `approval_id` fields give the frontend
    enough context to deep-link without extra requests.
    """

    document_title = serializers.SerializerMethodField()
    approval_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "document",
            "document_title",
            "approval_request",
            "approval_id",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields

    def get_document_title(self, obj) -> str | None:
        return obj.document.title if obj.document else None

    def get_approval_id(self, obj) -> int | None:
        return obj.approval_request_id
