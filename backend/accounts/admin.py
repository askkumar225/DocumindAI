from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Custom admin panel for the DocuMind User model."""

    list_display = [
        "username",
        "email",
        "role",
        "department",
        "is_staff",
        "is_active",
    ]

    list_filter = ["role", "department", "is_staff", "is_active"]

    fieldsets = UserAdmin.fieldsets + (
        (
            "DocuMind Info",
            {
                "fields": ("role", "department"),
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "DocuMind Info",
            {
                "fields": ("role", "department"),
            },
        ),
    )
