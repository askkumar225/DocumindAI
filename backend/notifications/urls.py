"""
URL configuration for the notifications app — Day 6.

Prefix: /api/notifications/

    GET  /api/notifications/               → list my notifications
    POST /api/notifications/read-all/      → mark all as read
    POST /api/notifications/{id}/read/     → mark one as read
"""

from django.urls import path

from .views import (
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
)

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path(
        "notifications/read-all/",
        NotificationMarkAllReadView.as_view(),
        name="notification-read-all",
    ),
    path(
        "notifications/<int:pk>/read/",
        NotificationMarkReadView.as_view(),
        name="notification-read",
    ),
]
