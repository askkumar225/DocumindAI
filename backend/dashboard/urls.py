"""
Dashboard URL configuration.

    GET /api/dashboard/           → DashboardView
    GET /api/dashboard/analytics/ → AnalyticsView
    GET /api/health/              → HealthCheckView
"""

from django.urls import path
from .views import AnalyticsView, DashboardView, HealthCheckView

urlpatterns = [
    path("dashboard/",            DashboardView.as_view(),  name="dashboard"),
    path("dashboard/analytics/",  AnalyticsView.as_view(),  name="dashboard-analytics"),
    path("health/",               HealthCheckView.as_view(), name="health-check"),
]
