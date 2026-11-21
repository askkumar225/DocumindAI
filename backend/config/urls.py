"""
DocuMind AI — Root URL configuration.
"""

from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),

    # Auth: register / login / refresh / me / logout
    path("api/auth/", include("accounts.urls")),

    # Documents API
    path("api/", include("documents.urls")),

    # Semantic Search (Day 4)
    path("api/", include("search.urls")),

    # Day 6 — Workflows (permissions, approvals, risks)
    path("api/", include("workflows.urls")),

    # Day 6 — Audit log
    path("api/", include("audit.urls")),

    # Day 6 — Notifications
    path("api/", include("notifications.urls")),

    # Chat (public assistant + authenticated document chat)
    path("api/", include("chat.urls")),

    # Dashboard — stats, analytics, health check
    path("api/", include("dashboard.urls")),

    # General AI — conversation-based LLM chat (no document access)
    path("api/", include("ai_app.urls")),

    # Career AI — resume, jobs, interviews, applications
    path("api/", include("career.urls")),

    # Government Exam Preparation — exams, syllabus, practice, mock tests
    path("api/", include("exams.urls")),
]


# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
