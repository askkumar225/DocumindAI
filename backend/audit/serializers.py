"""
Serializers for the audit app — Day 6.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AuditLog

User = get_user_model()


class _UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role"]


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for AuditLog records.

    Includes a brief user snapshot so the frontend can display
    "Ashok (MANAGER)" without a separate user lookup.
    """

    user_detail = _UserBriefSerializer(source="user", read_only=True)
    document_title = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_detail",
            "action",
            "document",
            "document_title",
            "description",
            "extra_data",
            "ip_address",
            "created_at",
        ]
        read_only_fields = fields

    def get_document_title(self, obj) -> str | None:
        return obj.document.title if obj.document else None
