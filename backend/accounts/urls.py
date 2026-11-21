from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, LogoutView, MeView, RegisterView

urlpatterns = [
    # Registration
    path("register/", RegisterView.as_view(), name="auth-register"),

    # Login — returns access + refresh + user profile
    path("login/", LoginView.as_view(), name="auth-login"),

    # Token refresh
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # Current user profile
    path("me/", MeView.as_view(), name="auth-me"),

    # Logout — blacklist refresh token
    path("logout/", LogoutView.as_view(), name="auth-logout"),
]
