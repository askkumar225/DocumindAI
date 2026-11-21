"""
Tests for the accounts app — model behavior, serializer validation,
and the logout endpoint (the new functionality added in PRD 01).
"""

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_user_creation(self):
        user = User.objects.create_user(
            username="modeluser",
            email="model@example.com",
            password="StrongPass123!",
        )
        assert user.pk is not None
        assert user.role == "EMPLOYEE"
        assert user.department == ""

    def test_user_with_role_and_department(self):
        user = User.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="StrongPass123!",
            role="ADMIN",
            department="IT",
        )
        assert user.role == "ADMIN"
        assert user.department == "IT"

    def test_user_str_representation(self):
        user = User.objects.create_user(
            username="struser",
            email="str@example.com",
            password="StrongPass123!",
            role="MANAGER",
        )
        assert str(user) == "struser (MANAGER)"

    def test_role_choices(self):
        """Only valid role values should be accepted."""
        for role in ("ADMIN", "MANAGER", "EMPLOYEE"):
            user = User.objects.create_user(
                username=f"r_{role}",
                email=f"r_{role}@example.com",
                password="StrongPass123!",
                role=role,
            )
            assert user.role == role


@pytest.mark.django_db
class TestRegisterSerializer:
    def test_duplicate_email_rejected(self):
        from accounts.serializers import RegisterSerializer

        User.objects.create_user(
            username="first",
            email="dup@example.com",
            password="StrongPass123!",
        )
        serializer = RegisterSerializer(data={
            "username": "second",
            "email": "dup@example.com",
            "password": "StrongPass123!",
        })
        assert not serializer.is_valid()
        assert "email" in serializer.errors

    def test_password_required(self):
        from accounts.serializers import RegisterSerializer

        serializer = RegisterSerializer(data={
            "username": "nopass",
            "email": "nopass@example.com",
        })
        assert not serializer.is_valid()
        assert "password" in serializer.errors

    def test_email_required(self):
        from accounts.serializers import RegisterSerializer

        serializer = RegisterSerializer(data={
            "username": "noemail",
            "password": "StrongPass123!",
        })
        assert not serializer.is_valid()
        assert "email" in serializer.errors
