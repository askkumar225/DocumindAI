"""
RAG security tests — verifies that semantic search and chat
never return content from documents the user is not authorized to access.
These are the most critical security tests in the project.
"""

import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient


def _create_user(django_user_model, username, role="EMPLOYEE"):
    return django_user_model.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="pass123!",
        role=role,
    )


def _auth_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.mark.django_db
class TestSemanticSearchPermissions:
    """
    Semantic search must never return chunks from documents
    the requesting user is not authorized to access.
    """

    def test_search_scoped_to_own_documents(self, django_user_model):
        user_a = _create_user(django_user_model, "search_a")
        user_b = _create_user(django_user_model, "search_b")

        client_a = _auth_client(user_a)
        client_b = _auth_client(user_b)

        # User A uploads a document
        from django.core.files.uploadedfile import SimpleUploadedFile
        pdf = SimpleUploadedFile("secret.pdf", b"%PDF-1.4 secret content", content_type="application/pdf")
        upload_res = client_a.post("/api/documents/upload/", {
            "title": "User A Secret",
            "file":  pdf,
        }, format="multipart")
        assert upload_res.status_code == 201
        doc_id = upload_res.data["id"]

        # Manually create a chunk for the document (simulating processed state)
        from documents.models import Document, DocumentChunk
        doc = Document.objects.get(id=doc_id)
        DocumentChunk.objects.create(
            document=doc,
            content="This is User A's secret content.",
            chunk_index=0,
            page_number=1,
            embedding=[0.1] * 10,
            char_count=33,
        )

        # Mock embed_text to return a non-zero vector so search proceeds
        with patch("documents.services.retriever.embed_text") as mock_embed:
            mock_embed.return_value = [0.1] * 10

            # User B searches — should get NO results from User A's document
            res = client_b.post("/api/search/", {"query": "secret content"}, format="json")
            assert res.status_code == 200
            result_doc_ids = [r["document_id"] for r in res.data.get("results", [])]
            assert doc_id not in result_doc_ids, (
                "SECURITY VIOLATION: User B received chunks from User A's document!"
            )

    def test_admin_can_search_all_documents(self, django_user_model):
        user_a = _create_user(django_user_model, "src_admin_a")
        admin  = _create_user(django_user_model, "src_admin_adm", role="ADMIN")

        client_a     = _auth_client(user_a)
        admin_client = _auth_client(admin)

        from django.core.files.uploadedfile import SimpleUploadedFile
        pdf = SimpleUploadedFile("admintest.pdf", b"%PDF-1.4 content", content_type="application/pdf")
        upload_res = client_a.post("/api/documents/upload/", {
            "title": "Admin Search Test",
            "file":  pdf,
        }, format="multipart")
        doc_id = upload_res.data["id"]

        from documents.models import Document, DocumentChunk
        doc = Document.objects.get(id=doc_id)
        DocumentChunk.objects.create(
            document=doc,
            content="Admin accessible content.",
            chunk_index=0,
            page_number=1,
            embedding=[0.1] * 10,
            char_count=25,
        )

        with patch("documents.services.retriever.embed_text") as mock_embed:
            mock_embed.return_value = [0.1] * 10

            # Admin can find the document
            res = admin_client.post("/api/search/", {"query": "accessible content"}, format="json")
            assert res.status_code == 200
            result_doc_ids = [r["document_id"] for r in res.data.get("results", [])]
            assert doc_id in result_doc_ids


@pytest.mark.django_db
class TestChatPermissions:
    """Chat must not expose content from unauthorized documents."""

    def test_chat_with_unauthorized_document_id(self, django_user_model):
        user_a = _create_user(django_user_model, "chat_a")
        user_b = _create_user(django_user_model, "chat_b")

        client_a = _auth_client(user_a)
        client_b = _auth_client(user_b)

        from django.core.files.uploadedfile import SimpleUploadedFile
        pdf = SimpleUploadedFile("private.pdf", b"%PDF-1.4 private", content_type="application/pdf")
        upload_res = client_a.post("/api/documents/upload/", {
            "title": "Private Doc",
            "file":  pdf,
        }, format="multipart")
        doc_id = upload_res.data["id"]

        # User B tries to chat scoped to User A's document
        with patch("documents.services.retriever.embed_text") as mock_embed, \
             patch("documents.services.retriever.semantic_search") as mock_search:
            mock_embed.return_value  = [0.0] * 10
            mock_search.return_value = []

            res = client_b.post("/api/chat/", {
                "question":     "What is in this document?",
                "document_ids": [doc_id],
            }, format="json")
            assert res.status_code == 200
            # The document should have been silently filtered — no content returned
            assert len(res.data.get("citations", [])) == 0


@pytest.mark.django_db
class TestHealthCheck:
    def test_health_check_accessible_without_auth(self):
        client = APIClient()
        res = client.get("/api/health/")
        assert res.status_code in (200, 503)
        assert res.data.get("status") in ("ok", "degraded")

    def test_health_check_database_field_present(self):
        client = APIClient()
        res = client.get("/api/health/")
        assert "database" in res.data
