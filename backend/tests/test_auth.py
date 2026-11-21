"""
Authentication tests — register, login, JWT, protected routes.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def registered_user(client, django_user_model):
    """Create a user via the register endpoint and return credentials."""
    url = reverse("auth-register")  # /api/auth/register/
    data = {
        "username": "testuser",
        "email":    "test@example.com",
        "password": "StrongPass123!",
    }
    res = client.post(url, data, format="json")
    assert res.status_code == 201
    return {"username": "testuser", "password": "StrongPass123!", "tokens": res.data}


@pytest.mark.django_db
class TestRegister:
    url = "/api/auth/register/"

    def test_register_success(self, client):
        res = client.post(self.url, {
            "username": "newuser",
            "email":    "newuser@example.com",
            "password": "StrongPass123!",
        }, format="json")
        assert res.status_code == 201
        assert "access"  in res.data
        assert "refresh" in res.data
        assert res.data["username"] == "newuser"

    def test_register_duplicate_email(self, client, django_user_model):
        django_user_model.objects.create_user(
            username="existing", email="dup@example.com", password="pass"
        )
        res = client.post(self.url, {
            "username": "another",
            "email":    "dup@example.com",
            "password": "StrongPass123!",
        }, format="json")
        assert res.status_code == 400

    def test_register_weak_password(self, client):
        res = client.post(self.url, {
            "username": "weakuser",
            "email":    "weak@example.com",
            "password": "123",
        }, format="json")
        assert res.status_code == 400

    def test_register_missing_fields(self, client):
        res = client.post(self.url, {"username": "nopass"}, format="json")
        assert res.status_code == 400


@pytest.mark.django_db
class TestLogin:
    url = "/api/auth/login/"

    def test_login_success(self, client, django_user_model):
        django_user_model.objects.create_user(
            username="loginuser", email="login@example.com", password="StrongPass123!"
        )
        res = client.post(self.url, {
            "username": "loginuser",
            "password": "StrongPass123!",
        }, format="json")
        assert res.status_code == 200
        assert "access"  in res.data
        assert "refresh" in res.data
        assert "user"    in res.data
        assert res.data["user"]["role"] in ("ADMIN", "MANAGER", "EMPLOYEE")

    def test_login_wrong_password(self, client, django_user_model):
        django_user_model.objects.create_user(
            username="u2", email="u2@example.com", password="rightpass"
        )
        res = client.post(self.url, {"username": "u2", "password": "wrongpass"}, format="json")
        assert res.status_code == 401

    def test_login_unknown_user(self, client):
        res = client.post(self.url, {"username": "ghost", "password": "pass"}, format="json")
        assert res.status_code == 401

    def test_login_missing_credentials(self, client):
        res = client.post(self.url, {}, format="json")
        assert res.status_code == 400


@pytest.mark.django_db
class TestProtectedRoutes:
    def test_unauthenticated_documents(self, client):
        res = client.get("/api/documents/")
        assert res.status_code == 401

    def test_unauthenticated_chat(self, client):
        res = client.post("/api/chat/", {"question": "hello"}, format="json")
        assert res.status_code == 401

    def test_unauthenticated_comparisons(self, client):
        res = client.get("/api/comparisons/")
        assert res.status_code == 401

    def test_unauthenticated_audit(self, client):
        res = client.get("/api/audit/")
        assert res.status_code == 401

    def test_authenticated_me(self, client, django_user_model):
        user = django_user_model.objects.create_user(
            username="authme", email="authme@example.com", password="pass123!"
        )
        client.force_authenticate(user=user)
        res = client.get("/api/auth/me/")
        assert res.status_code == 200
        assert res.data["username"] == "authme"

    def test_health_check_public(self, client):
        """Health check must be accessible without authentication."""
        res = client.get("/api/health/")
        assert res.status_code in (200, 503)
        assert "status"   in res.data
        assert "database" in res.data


@pytest.mark.django_db
class TestTokenRefresh:
    url = "/api/auth/token/refresh/"

    def test_refresh_success(self, client, django_user_model):
        """A valid refresh token returns a new access token."""
        django_user_model.objects.create_user(
            username="refuser", email="ref@example.com", password="StrongPass123!"
        )
        login_res = client.post("/api/auth/login/", {
            "username": "refuser",
            "password": "StrongPass123!",
        }, format="json")
        refresh = login_res.data["refresh"]

        res = client.post(self.url, {"refresh": refresh}, format="json")
        assert res.status_code == 200
        assert "access" in res.data

    def test_refresh_invalid_token(self, client):
        """An invalid refresh token is rejected."""
        res = client.post(self.url, {"refresh": "garbage-token"}, format="json")
        assert res.status_code == 401

    def test_refresh_missing_token(self, client):
        """Missing refresh field returns 400."""
        res = client.post(self.url, {}, format="json")
        assert res.status_code == 400


@pytest.mark.django_db
class TestLogout:
    url = "/api/auth/logout/"

    def test_logout_success(self, client, django_user_model):
        """An authenticated user can blacklist their refresh token."""
        django_user_model.objects.create_user(
            username="logoutuser", email="logout@example.com", password="StrongPass123!"
        )
        login_res = client.post("/api/auth/login/", {
            "username": "logoutuser",
            "password": "StrongPass123!",
        }, format="json")
        access = login_res.data["access"]
        refresh = login_res.data["refresh"]

        res = client.post(
            self.url,
            {"refresh": refresh},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        assert res.status_code == 200
        assert res.data["message"] == "Logout successful"

    def test_logout_blacklists_token(self, client, django_user_model):
        """After logout the refresh token can no longer be used."""
        django_user_model.objects.create_user(
            username="bluser", email="bl@example.com", password="StrongPass123!"
        )
        login_res = client.post("/api/auth/login/", {
            "username": "bluser",
            "password": "StrongPass123!",
        }, format="json")
        access = login_res.data["access"]
        refresh = login_res.data["refresh"]

        # Logout
        client.post(
            self.url,
            {"refresh": refresh},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        # The blacklisted refresh token should now fail
        res = client.post("/api/auth/token/refresh/", {"refresh": refresh}, format="json")
        assert res.status_code == 401

    def test_logout_unauthenticated(self, client):
        """Logout requires authentication."""
        res = client.post(self.url, {"refresh": "some-token"}, format="json")
        assert res.status_code == 401

    def test_logout_missing_refresh(self, client, django_user_model):
        """Missing refresh field returns 400."""
        django_user_model.objects.create_user(
            username="nomiss", email="nomiss@example.com", password="StrongPass123!"
        )
        login_res = client.post("/api/auth/login/", {
            "username": "nomiss",
            "password": "StrongPass123!",
        }, format="json")
        access = login_res.data["access"]

        res = client.post(
            self.url, {}, format="json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        assert res.status_code == 400


@pytest.mark.django_db
class TestRoles:
    """Verify that role assignment works and defaults to EMPLOYEE."""

    def test_default_role_is_employee(self, client):
        res = client.post("/api/auth/register/", {
            "username": "defaultrole",
            "email":    "defaultrole@example.com",
            "password": "StrongPass123!",
        }, format="json")
        assert res.status_code == 201

        # Fetch the user profile with the just-issued token
        access = res.data["access"]
        me_res = client.get(
            "/api/auth/me/",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        assert me_res.status_code == 200
        assert me_res.data["role"] == "EMPLOYEE"

    def test_register_with_admin_role(self, client):
        res = client.post("/api/auth/register/", {
            "username":   "adminuser",
            "email":      "admin@example.com",
            "password":    "StrongPass123!",
            "role":        "ADMIN",
            "department":  "Engineering",
        }, format="json")
        assert res.status_code == 201

        access = res.data["access"]
        me_res = client.get(
            "/api/auth/me/",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        assert me_res.status_code == 200
        assert me_res.data["role"] == "ADMIN"
        assert me_res.data["department"] == "Engineering"

    def test_login_returns_role(self, client, django_user_model):
        django_user_model.objects.create_user(
            username="manageruser",
            email="manager@example.com",
            password="StrongPass123!",
            role="MANAGER",
            department="Sales",
        )
        res = client.post("/api/auth/login/", {
            "username": "manageruser",
            "password": "StrongPass123!",
        }, format="json")
        assert res.status_code == 200
        assert res.data["user"]["role"] == "MANAGER"
        assert res.data["user"]["department"] == "Sales"

    def test_all_roles_accepted(self, client):
        """ADMIN, MANAGER, and EMPLOYEE are all valid role choices."""
        for role in ("ADMIN", "MANAGER", "EMPLOYEE"):
            res = client.post("/api/auth/register/", {
                "username": f"user_{role.lower()}",
                "email":     f"{role.lower()}@example.com",
                "password":  "StrongPass123!",
                "role":      role,
            }, format="json")
            assert res.status_code == 201, f"Role {role} should be accepted"
