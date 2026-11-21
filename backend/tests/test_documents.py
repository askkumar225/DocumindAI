"""
Document API tests — upload validation, access control, processing status.
"""

import io
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient


@pytest.fixture
def auth_client(django_user_model):
    client = APIClient()
    user = django_user_model.objects.create_user(
        username="docuser", email="docuser@example.com", password="pass123!"
    )
    client.force_authenticate(user=user)
    return client, user


@pytest.fixture
def other_client(django_user_model):
    """A second user with no shared documents."""
    client = APIClient()
    user = django_user_model.objects.create_user(
        username="other", email="other@example.com", password="pass123!"
    )
    client.force_authenticate(user=user)
    return client, user


def _fake_pdf(name="test.pdf", size=100):
    content = b"%PDF-1.4 fake content " + b"x" * size
    return SimpleUploadedFile(name, content, content_type="application/pdf")


@pytest.mark.django_db
class TestDocumentUpload:
    url = "/api/documents/upload/"

    def test_upload_valid_pdf(self, auth_client):
        client, _ = auth_client
        res = client.post(self.url, {
            "title": "Test Contract",
            "file":  _fake_pdf(),
        }, format="multipart")
        assert res.status_code == 201
        assert res.data["title"]  == "Test Contract"
        assert res.data["status"] == "UPLOADED"

    def test_upload_requires_auth(self):
        anon = APIClient()
        res = anon.post(self.url, {
            "title": "Anonymous",
            "file":  _fake_pdf(),
        }, format="multipart")
        assert res.status_code == 401

    def test_upload_invalid_extension(self, auth_client):
        client, _ = auth_client
        bad_file = SimpleUploadedFile("evil.exe", b"bad content", content_type="application/octet-stream")
        res = client.post(self.url, {"title": "Bad", "file": bad_file}, format="multipart")
        assert res.status_code == 400

    def test_upload_oversized_file(self, auth_client):
        client, _ = auth_client
        big_file = SimpleUploadedFile(
            "big.pdf",
            b"%PDF-1.4 " + b"x" * (11 * 1024 * 1024),  # 11 MB
            content_type="application/pdf"
        )
        res = client.post(self.url, {"title": "Big", "file": big_file}, format="multipart")
        assert res.status_code == 400

    def test_upload_missing_title(self, auth_client):
        client, _ = auth_client
        res = client.post(self.url, {"file": _fake_pdf()}, format="multipart")
        assert res.status_code == 400


@pytest.mark.django_db
class TestDocumentAccess:
    """
    RBAC + object-level permission tests.
    A user must only see their own documents unless a DocumentPermission exists.
    """

    def test_list_only_own_documents(self, auth_client, other_client):
        client_a, user_a = auth_client
        client_b, user_b = other_client

        # User A uploads a document
        client_a.post("/api/documents/upload/", {
            "title": "User A Doc",
            "file":  _fake_pdf(),
        }, format="multipart")

        # User B's list should be empty
        res = client_b.get("/api/documents/")
        assert res.status_code == 200
        titles = [d["title"] for d in res.data]
        assert "User A Doc" not in titles

    def test_retrieve_own_document(self, auth_client):
        client, _ = auth_client
        upload = client.post("/api/documents/upload/", {
            "title": "My Doc",
            "file":  _fake_pdf(),
        }, format="multipart")
        assert upload.status_code == 201
        doc_id = upload.data["id"]

        res = client.get(f"/api/documents/{doc_id}/")
        assert res.status_code == 200

    def test_retrieve_other_user_document_forbidden(self, auth_client, other_client):
        client_a, _ = auth_client
        client_b, _ = other_client

        upload = client_a.post("/api/documents/upload/", {
            "title": "Private",
            "file":  _fake_pdf(),
        }, format="multipart")
        doc_id = upload.data["id"]

        res = client_b.get(f"/api/documents/{doc_id}/")
        assert res.status_code == 403


@pytest.mark.django_db
class TestDocumentStatus:
    def test_initial_status_is_uploaded(self, auth_client):
        client, _ = auth_client
        res = client.post("/api/documents/upload/", {
            "title": "Status Test",
            "file":  _fake_pdf(),
        }, format="multipart")
        assert res.status_code == 201
        assert res.data["status"] == "UPLOADED"

    def test_delete_own_document(self, auth_client):
        client, _ = auth_client
        res = client.post("/api/documents/upload/", {
            "title": "Delete Me",
            "file":  _fake_pdf(),
        }, format="multipart")
        doc_id = res.data["id"]

        del_res = client.delete(f"/api/documents/{doc_id}/")
        assert del_res.status_code == 204

    def test_delete_other_user_document_forbidden(self, auth_client, other_client):
        client_a, _ = auth_client
        client_b, _ = other_client

        upload = client_a.post("/api/documents/upload/", {
            "title": "Not Yours",
            "file":  _fake_pdf(),
        }, format="multipart")
        doc_id = upload.data["id"]

        res = client_b.delete(f"/api/documents/{doc_id}/")
        assert res.status_code == 403
