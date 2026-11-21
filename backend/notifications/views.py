"""
Notification views for DocuMind AI — Day 6.

Endpoints:
    GET  /api/notifications/              → list my notifications (newest first)
    POST /api/notifications/{id}/read/    → mark a notification as read
    POST /api/notifications/read-all/     → mark all my notifications as read
"""

import logging

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer

logger = logging.getLogger(__name__)


class NotificationListView(APIView):
    """
    GET /api/notifications/

    Returns the authenticated user's notifications, newest first.

    Query params:
        unread_only — set to "true" to return only unread notifications
        limit       — max records (default 50, max 200)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user)

        unread_only = request.query_params.get("unread_only", "").lower() == "true"
        if unread_only:
            qs = qs.filter(is_read=False)

        try:
            limit = min(int(request.query_params.get("limit", 50)), 200)
        except (TypeError, ValueError):
            limit = 50

        qs = qs[:limit]
        serializer = NotificationSerializer(qs, many=True)

        unread_count = Notification.objects.filter(
            user=request.user, is_read=False
        ).count()

        return Response({
            "unread_count": unread_count,
            "count": len(serializer.data),
            "notifications": serializer.data,
        })


class NotificationMarkReadView(APIView):
    """
    POST /api/notifications/{id}/read/

    Mark a single notification as read.
    Users can only mark their own notifications.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Notification not found."}, status=404)

        notification.is_read = True
        notification.save(update_fields=["is_read"])

        return Response({"detail": "Notification marked as read.", "id": pk})


class NotificationMarkAllReadView(APIView):
    """
    POST /api/notifications/read-all/

    Mark all of the authenticated user's notifications as read.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)

        return Response({
            "detail": f"{updated} notification(s) marked as read.",
            "updated": updated,
        })
