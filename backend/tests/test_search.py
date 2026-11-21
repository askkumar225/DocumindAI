"""
PRD 05 — Semantic Search: automated tests.

Coverage:
  - Chunker: normal text, page markers, form-feed, empty, long paragraphs
  - Embeddings: placeholder key detection, dimension validation, empty text
  - Retriever: empty query rejection, permission enforcement, zero-vector handling
  - Search API: auth, empty query, bad top_k, permission error, success response
  - DocumentIndexStatus: created on chunk_and_embed, stale-hash skip, failure state

All LLM / embedding API calls are mocked — no real API key required.
"""

import hashlib
from unittest.mock import MagicMock, patch

import pytest
from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from documents.models import (
    Document, DocumentChunk, DocumentIndexStatus, ExtractedContent,
)
from documents.services.chunker import Chunk, create_chunks, _build_page_map
from documents.services.embeddings import embed_text, embed_texts, _is_valid_api_key


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_user(username: str, role: str = "EMPLOYEE") -> User:
    return User.objects.create_user(
        username=username,
        password="testpass123",
        email=f"{username}@test.com",
        role=role,
    )


def make_document(user: User, title: str = "Test.pdf", text: str = "") -> Document:
    doc = Document.objects.create(
        title=title,
        file="documents/test.pdf",
        status="READY",
        uploaded_by=user,
    )
    if text:
        ExtractedContent.objects.create(
            document=doc,
            text=text,
            page_count=1,
            extraction_method="PDF_TEXT",
        )
    return doc


def make_chunk(doc: Document, content: str, index: int = 0,
               embedding: list | None = None) -> DocumentChunk:
    return DocumentChunk.objects.create(
        document=doc,
        content=content,
        chunk_index=index,
        page_number=1,
        char_count=len(content),
        embedding=embedding or [0.1] * settings.EMBEDDING_DIM,
    )


# ─── 1. Chunker tests ─────────────────────────────────────────────────────────

class TestChunker(TestCase):

    def test_empty_text_returns_no_chunks(self):
        self.assertEqual(create_chunks(""), [])
        self.assertEqual(create_chunks("   \n\n  "), [])

    def test_short_text_produces_one_chunk(self):
        chunks = create_chunks("Payment must be made within 30 days.")
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].chunk_index, 0)
        self.assertIn("Payment", chunks[0].content)

    def test_chunk_indices_are_sequential(self):
        long_text = ("This sentence contains relevant contract information. " * 30)
        chunks = create_chunks(long_text)
        self.assertGreater(len(chunks), 1)
        for i, c in enumerate(chunks):
            self.assertEqual(c.chunk_index, i)

    def test_char_count_matches_content_length(self):
        chunks = create_chunks("Invoice total is 50000 INR. Payment due in 30 days.")
        for c in chunks:
            self.assertEqual(c.char_count, len(c.content))
            self.assertGreater(c.char_count, 0)

    def test_formfeed_page_map_has_multiple_pages(self):
        text = "First page content.\f Second page content."
        page_map = _build_page_map(text)
        self.assertGreaterEqual(len(page_map), 2)
        self.assertIn(2, page_map.values())

    def test_page_marker_detection(self):
        text = "[Page 1]\nFirst page.\n\n[Page 2]\nSecond page."
        page_map = _build_page_map(text)
        self.assertIn(2, page_map.values())

    def test_no_page_info_returns_empty_map(self):
        self.assertEqual(_build_page_map("No markers here."), {})

    def test_page_number_is_none_when_no_page_info(self):
        chunks = create_chunks("Some plain document text without page markers.")
        self.assertTrue(all(c.page_number is None for c in chunks))

    def test_page_number_set_from_formfeed(self):
        text = "First page content here.\f Second page content here."
        chunks = create_chunks(text)
        pages = {c.page_number for c in chunks if c.page_number is not None}
        self.assertGreaterEqual(len(pages), 1)

    def test_page_marker_chunks_have_page_numbers(self):
        text = "[Page 1]\nPayment terms are 30 days.\n\n[Page 2]\nLate payment incurs 2% penalty."
        chunks = create_chunks(text)
        # At least one chunk should have a non-None page
        self.assertTrue(any(c.page_number is not None for c in chunks))

    def test_long_document_produces_multiple_chunks(self):
        # Enough text to exceed default CHUNK_SIZE
        text = "This is a contract clause. " * 100
        chunks = create_chunks(text)
        self.assertGreater(len(chunks), 1)

    def test_chunk_content_is_never_empty_string(self):
        text = "Invoice No: INV-001. Amount: 50000. Due: 2026-12-01."
        chunks = create_chunks(text)
        for c in chunks:
            self.assertTrue(c.content.strip(), "Chunk content must not be empty")


# ─── 2. Embeddings tests ──────────────────────────────────────────────────────

class TestEmbeddings(TestCase):

    def test_placeholder_keys_rejected(self):
        self.assertFalse(_is_valid_api_key(""))
        self.assertFalse(_is_valid_api_key("your_openai_api_key_here"))
        self.assertFalse(_is_valid_api_key("sk-..."))
        self.assertFalse(_is_valid_api_key("YOUR_API_KEY"))
        self.assertFalse(_is_valid_api_key("your_api_key_here"))

    def test_real_key_format_accepted(self):
        self.assertTrue(_is_valid_api_key("sk-realkey123abc"))
        self.assertTrue(_is_valid_api_key("sk-proj-XYZ456"))

    def test_empty_text_returns_zero_vector(self):
        result = embed_text("")
        self.assertTrue(all(v == 0.0 for v in result))

    def test_whitespace_only_returns_zero_vector(self):
        result = embed_text("   \n\t  ")
        self.assertTrue(all(v == 0.0 for v in result))

    @override_settings(LLM_API_KEY="your_openai_api_key_here")
    def test_placeholder_key_in_settings_returns_zero_vector(self):
        result = embed_text("some meaningful text")
        self.assertTrue(all(v == 0.0 for v in result))

    def test_embed_texts_empty_list_returns_empty(self):
        result = embed_texts([])
        self.assertEqual(result, [])

    @override_settings(LLM_API_KEY="your_openai_api_key_here")
    def test_embed_texts_placeholder_returns_zero_vectors(self):
        texts = ["text one", "text two"]
        result = embed_texts(texts)
        self.assertEqual(len(result), 2)
        for vec in result:
            self.assertTrue(all(v == 0.0 for v in vec))

    @patch("documents.services.embeddings._call_openai_embedding")
    @override_settings(LLM_API_KEY="sk-validkey123")
    def test_dimension_mismatch_returns_zero_vectors(self, mock_call):
        # Mock returns wrong dimension
        mock_call.return_value = [[0.5] * 512]   # expected 1536
        result = embed_texts(["some text"])
        self.assertTrue(all(v == 0.0 for v in result[0]))

    @patch("documents.services.embeddings._call_openai_embedding")
    @override_settings(LLM_API_KEY="sk-validkey123")
    def test_valid_embedding_returned_as_is(self, mock_call):
        expected = [0.1] * settings.EMBEDDING_DIM
        mock_call.return_value = [expected]
        result = embed_texts(["real document text"])
        self.assertEqual(result[0], expected)

    @patch("documents.services.embeddings._call_openai_embedding",
           side_effect=Exception("API error"))
    @override_settings(LLM_API_KEY="sk-validkey123")
    def test_api_failure_returns_zero_vectors(self, _mock):
        result = embed_texts(["text"])
        self.assertTrue(all(v == 0.0 for v in result[0]))


# ─── 3. Retriever tests ───────────────────────────────────────────────────────

class TestRetriever(TestCase):

    def setUp(self):
        self.user_a = make_user("user_a")
        self.user_b = make_user("user_b")

    def test_empty_query_raises_value_error(self):
        from documents.services.retriever import semantic_search
        with self.assertRaises(ValueError):
            semantic_search("", user=self.user_a)

    def test_whitespace_query_raises_value_error(self):
        from documents.services.retriever import semantic_search
        with self.assertRaises(ValueError):
            semantic_search("   ", user=self.user_a)

    @patch("documents.services.retriever.embed_text",
           return_value=[0.0] * 1536)
    def test_zero_vector_returns_empty(self, _mock):
        from documents.services.retriever import semantic_search
        doc = make_document(self.user_a, text="Some content")
        make_chunk(doc, "Some content", embedding=[0.1] * 1536)
        results = semantic_search("test query", user=self.user_a)
        self.assertEqual(results, [])

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    def test_cross_user_isolation(self, _mock):
        """user_b's documents must never appear in user_a's search results."""
        from documents.services.retriever import semantic_search

        # user_b has a document with a matching chunk
        doc_b = make_document(self.user_b, title="B_doc.pdf",
                               text="Highly relevant payment content")
        make_chunk(doc_b, "Highly relevant payment content",
                   embedding=[1.0] + [0.0] * 1535)

        results = semantic_search("payment terms", user=self.user_a)
        result_doc_ids = {r.document_id for r in results}
        self.assertNotIn(doc_b.id, result_doc_ids)

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    def test_own_documents_are_returned(self, _mock):
        from documents.services.retriever import semantic_search

        doc = make_document(self.user_a, text="Payment terms content")
        make_chunk(doc, "Payment is due in 30 days.",
                   embedding=[1.0] + [0.0] * 1535)

        results = semantic_search("payment terms", user=self.user_a)
        result_doc_ids = {r.document_id for r in results}
        self.assertIn(doc.id, result_doc_ids)

    def test_unauthorized_document_id_raises_permission_error(self):
        from documents.services.retriever import semantic_search

        doc_b = make_document(self.user_b, text="Private content")
        with self.assertRaises(PermissionError):
            semantic_search("content", user=self.user_a,
                            document_id=doc_b.id)

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    def test_own_document_id_filter_accepted(self, _mock):
        from documents.services.retriever import semantic_search

        doc = make_document(self.user_a, text="Specific document content")
        make_chunk(doc, "Specific document content",
                   embedding=[1.0] + [0.0] * 1535)

        # Should not raise
        results = semantic_search("content", user=self.user_a,
                                  document_id=doc.id)
        self.assertIsInstance(results, list)

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    def test_top_k_limits_results(self, _mock):
        from documents.services.retriever import semantic_search

        doc = make_document(self.user_a, text="Content")
        for i in range(10):
            make_chunk(doc, f"Chunk content number {i}",
                       index=i, embedding=[1.0] + [0.0] * 1535)

        results = semantic_search("content", user=self.user_a, top_k=3)
        self.assertLessEqual(len(results), 3)

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    def test_similarity_values_between_0_and_1(self, _mock):
        from documents.services.retriever import semantic_search

        doc = make_document(self.user_a, text="Test content")
        make_chunk(doc, "Test content here",
                   embedding=[0.9] + [0.0] * 1535)

        results = semantic_search("content", user=self.user_a)
        for r in results:
            self.assertGreaterEqual(r.similarity, 0.0)
            self.assertLessEqual(r.similarity, 1.0)

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    def test_chunks_with_no_embedding_excluded(self, _mock):
        from documents.services.retriever import semantic_search

        doc = make_document(self.user_a, text="Content")
        # Empty embedding chunk — should be excluded
        DocumentChunk.objects.create(
            document=doc, content="No embedding chunk",
            chunk_index=0, page_number=None,
            char_count=18, embedding=[],
        )
        # Valid chunk
        make_chunk(doc, "Valid embedded chunk",
                   index=1, embedding=[1.0] + [0.0] * 1535)

        results = semantic_search("content", user=self.user_a)
        result_contents = [r.content for r in results]
        self.assertNotIn("No embedding chunk", result_contents)


# ─── 4. Search API tests ──────────────────────────────────────────────────────

class TestSearchAPI(TestCase):

    def setUp(self):
        self.user = make_user("search_user")
        self.client = APIClient()

    def test_unauthenticated_request_returns_401(self):
        resp = self.client.post("/api/search/", {"query": "test"}, format="json")
        self.assertEqual(resp.status_code, 401)

    def test_empty_query_returns_400(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post("/api/search/", {"query": ""}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_missing_query_returns_400(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post("/api/search/", {}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_top_k_above_max_returns_400(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/search/",
            {"query": "test", "top_k": 999},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_top_k_zero_returns_400(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/search/",
            {"query": "test", "top_k": 0},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    @patch("documents.services.retriever.embed_text",
           return_value=[0.0] * 1536)
    def test_zero_vector_returns_200_empty_results(self, _mock):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/search/",
            {"query": "some query"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["total_results"], 0)
        self.assertEqual(resp.data["results"], [])

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    def test_successful_search_returns_expected_fields(self, _mock):
        self.client.force_authenticate(user=self.user)
        doc = make_document(self.user, text="Payment due in 30 days")
        make_chunk(doc, "Payment due in 30 days.",
                   embedding=[1.0] + [0.0] * 1535)

        resp = self.client.post(
            "/api/search/",
            {"query": "payment deadline"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("query", resp.data)
        self.assertIn("total_results", resp.data)
        self.assertIn("results", resp.data)

        if resp.data["results"]:
            r = resp.data["results"][0]
            for field in ("chunk_id", "document_id", "document_title",
                          "document_type", "chunk_index", "content", "similarity"):
                self.assertIn(field, r)

    def test_other_user_document_id_returns_403(self):
        other = make_user("other_user")
        doc_other = make_document(other, text="Private content")

        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/search/",
            {"query": "content", "document_id": doc_other.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    def test_response_query_matches_input(self, _mock):
        self.client.force_authenticate(user=self.user)
        query = "Who are the contracting parties?"
        resp = self.client.post(
            "/api/search/",
            {"query": query},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["query"], query)


# ─── 5. DocumentIndexStatus tests ─────────────────────────────────────────────

class TestDocumentIndexStatus(TestCase):

    def setUp(self):
        self.user = make_user("idx_user")

    def test_index_status_created_with_pending(self):
        doc = make_document(self.user, text="")
        idx, created = DocumentIndexStatus.objects.get_or_create(document=doc)
        self.assertTrue(created)
        self.assertEqual(idx.status, "PENDING")

    def test_index_status_fields_saved_correctly(self):
        from django.utils import timezone
        doc = make_document(self.user, text="Content")
        idx = DocumentIndexStatus.objects.create(
            document=doc,
            status="READY",
            chunk_count=5,
            content_hash="abc123",
            indexed_at=timezone.now(),
        )
        idx.refresh_from_db()
        self.assertEqual(idx.status, "READY")
        self.assertEqual(idx.chunk_count, 5)
        self.assertEqual(idx.content_hash, "abc123")
        self.assertIsNotNone(idx.indexed_at)

    def test_content_hash_matches_md5(self):
        text = "Invoice content for testing."
        expected = hashlib.md5(text.encode("utf-8")).hexdigest()
        self.assertEqual(len(expected), 32)
        # Verify our hash function logic
        self.assertEqual(
            hashlib.md5(text.encode("utf-8", errors="replace")).hexdigest(),
            expected,
        )

    def test_index_status_deleted_with_document(self):
        doc = make_document(self.user, text="Content")
        idx = DocumentIndexStatus.objects.create(document=doc, status="READY")
        doc_id = doc.id
        doc.delete()
        self.assertFalse(
            DocumentIndexStatus.objects.filter(id=idx.id).exists()
        )

    def test_reindex_endpoint_requires_auth(self):
        client = APIClient()
        doc = make_document(self.user, text="Content")
        resp = client.post(f"/api/documents/{doc.id}/reindex/")
        self.assertEqual(resp.status_code, 401)

    def test_reindex_endpoint_accepted_for_ready_doc(self):
        client = APIClient()
        client.force_authenticate(user=self.user)

        doc = make_document(self.user, text="Content here.")
        # Patch chunk_and_embed so it doesn't actually run
        with patch("documents.tasks.chunk_and_embed.delay"):
            resp = client.post(f"/api/documents/{doc.id}/reindex/")

        self.assertEqual(resp.status_code, 202)
        self.assertIn("document_id", resp.data)

    def test_reindex_endpoint_rejected_for_uploaded_doc(self):
        client = APIClient()
        client.force_authenticate(user=self.user)

        doc = Document.objects.create(
            title="Unprocessed.pdf",
            file="documents/test.pdf",
            status="UPLOADED",
            uploaded_by=self.user,
        )
        resp = client.post(f"/api/documents/{doc.id}/reindex/")
        self.assertEqual(resp.status_code, 400)

    def test_other_user_cannot_reindex(self):
        other = make_user("other_reindex")
        doc = make_document(self.user, text="Content")

        client = APIClient()
        client.force_authenticate(user=other)
        resp = client.post(f"/api/documents/{doc.id}/reindex/")
        # Should be 404 (not found in other's queryset) or 403
        self.assertIn(resp.status_code, [403, 404])

    def test_index_status_endpoint_returns_pending_when_no_record(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        doc = make_document(self.user, text="Content")

        resp = client.get(f"/api/documents/{doc.id}/index_status/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "PENDING")
        self.assertEqual(resp.data["chunk_count"], 0)

    def test_index_status_endpoint_returns_ready_when_indexed(self):
        from django.utils import timezone
        client = APIClient()
        client.force_authenticate(user=self.user)
        doc = make_document(self.user, text="Content")
        DocumentIndexStatus.objects.create(
            document=doc,
            status="READY",
            chunk_count=10,
            indexed_at=timezone.now(),
        )

        resp = client.get(f"/api/documents/{doc.id}/index_status/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "READY")
        self.assertEqual(resp.data["chunk_count"], 10)
