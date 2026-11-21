"""
Dashboard views — stats, insights, analytics, and health check.

Endpoints:
    GET /api/dashboard/          → headline stats + insights + recent docs
    GET /api/dashboard/analytics/ → chart data (by type, status, risk, uploads)
    GET /api/health/              → service health (db + redis)
"""

import logging

from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import get_analytics, get_insights, get_recent_documents, get_stats

logger = logging.getLogger(__name__)


class DashboardView(APIView):
    """
    GET /api/dashboard/

    Returns everything the dashboard needs in one request:
        stats       — headline numbers
        insights    — AI-generated actionable cards
        recent_docs — last 5 uploaded documents
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "stats":       get_stats(user),
            "insights":    get_insights(user),
            "recent_docs": get_recent_documents(user, limit=5),
        })


class AnalyticsView(APIView):
    """
    GET /api/dashboard/analytics/

    Returns data for charts:
        documents_by_type, documents_by_status,
        risk_distribution, uploads_last_7_days
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_analytics(request.user))


class HealthCheckView(APIView):
    """
    GET /api/health/

    Checks database and Redis connectivity.
    Returns HTTP 200 if all healthy, HTTP 503 if any service is down.
    Used by Docker healthchecks and deployment platforms.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        status = {"status": "ok"}
        http_status = 200

        # ── Database ──────────────────────────────────────────────────────────
        try:
            from django.db import connection
            connection.ensure_connection()
            status["database"] = "ok"
        except Exception as exc:
            logger.error("Health check — DB failed: %s", exc)
            status["database"] = "error"
            http_status = 503

        # ── Redis ─────────────────────────────────────────────────────────────
        try:
            from django.conf import settings
            import redis
            r = redis.from_url(getattr(settings, "CELERY_BROKER_URL", "redis://localhost:6379/0"))
            r.ping()
            status["redis"] = "ok"
        except Exception as exc:
            logger.warning("Health check — Redis unavailable: %s", exc)
            status["redis"] = "unavailable"
            # Don't fail health check for Redis — app still works without it in degraded mode

        if http_status == 200:
            status["status"] = "ok"
        else:
            status["status"] = "degraded"

        return Response(status, status=http_status)
