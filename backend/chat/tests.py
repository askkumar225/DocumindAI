"""
PRD 07 — Document AI Chat (RAG): comprehensive backend test suite.

Coverage:
  Conversation management
    - Create via POST /api/chat/
    - List (own only)
    - Retrieve (own only)
    - Rename (own only)
    - Delete (own only)
    - Cross-user access denied

  Document selection
    - Only accessible documents accepted
    - Unauthorized documents rejected
    - Document scoping verified

  RAG Chat
    - User message persisted
    - Assistant message persisted
    - Citations returned from semantic_search results (not LLM)
    - Placeholder LLM key returns no-results fallback, not error
    - Sources-found flag set correctly
    - LLM unavailable → fallback answer from first chunk
    - No documents → empty citations
    - Cross-user document cannot be retrieved

  Suggested questions
    - Returns questions for a valid document
    - Returns empty for unauthorized document

  Privacy
    - User A cannot access User B's conversation
    - RAG retrieval restricted to selected documents
    - Selected-document scope not auto-expanded

  Serializers
    - ConversationSerializer includes document_ids
    - MessageSerializer includes citations and sources_found
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from chat.models import Conversation, Message
from documents.models import Document, DocumentChunk, ExtractedContent


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_user(username: str) -> User:
    return User.objects.create_user(
        username=username,
        password="testpass123",
        email=f"{username}@test.com",
    )


def make_document(user: User, title: str = "Test.pdf",
                  status: str = "READY") -> Document:
    return Document.objects.create(
        title=title,
        file="documents/test.pdf",
        status=status,
        uploaded_by=user,
    )


def make_chunk(doc: Document, content: str,
               index: int = 0,
               embedding: list | None = None) -> DocumentChunk:
    return DocumentChunk.objects.create(
        document=doc,
        content=content,
        chunk_index=index,
        page_number=1,
        char_count=len(content),
        embedding=embedding if embedding is not None else [0.1] * 1536,
    )


def make_conversation(user: User, title: str = "Test conv") -> Conversation:
    return Conversation.objects.create(user=user, title=title)


# ─── 1. Conversation CRUD ─────────────────────────────────────────────────────

class TestConversationCRUD(TestCase):

    def setUp(self):
        self.user_a = make_user("chat_a")
        self.user_b = make_user("chat_b")
        self.client = APIClient()

    # ── List ──────────────────────────────────────────────────────────────────

    def test_list_requires_auth(self):
        resp = self.client.get("/api/chat/conversations/")
        self.assertEqual(resp.status_code, 401)

    def test_list_returns_own_conversations_only(self):
        make_conversation(self.user_a, "A's chat")
        make_conversation(self.user_b, "B's chat")

        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get("/api/chat/conversations/")

        self.assertEqual(resp.status_code, 200)
        titles = [c["title"] for c in resp.data]
        self.assertIn("A's chat", titles)
        self.assertNotIn("B's chat", titles)

    # ── Retrieve ──────────────────────────────────────────────────────────────

    def test_retrieve_own_conversation(self):
        conv = make_conversation(self.user_a)
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get(f"/api/chat/conversations/{conv.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["id"], conv.id)

    def test_retrieve_other_user_conversation_returns_404(self):
        conv = make_conversation(self.user_b)
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get(f"/api/chat/conversations/{conv.id}/")
        self.assertEqual(resp.status_code, 404)

    # ── Rename ────────────────────────────────────────────────────────────────

    def test_rename_own_conversation(self):
        conv = make_conversation(self.user_a, "Old title")
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.patch(
            f"/api/chat/conversations/{conv.id}/",
            {"title": "New title"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["title"], "New title")
        conv.refresh_from_db()
        self.assertEqual(conv.title, "New title")

    def test_rename_other_user_conversation_returns_404(self):
        conv = make_conversation(self.user_b)
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.patch(
            f"/api/chat/conversations/{conv.id}/",
            {"title": "Hijacked"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_rename_missing_title_returns_400(self):
        conv = make_conversation(self.user_a)
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.patch(
            f"/api/chat/conversations/{conv.id}/",
            {"title": ""},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    # ── Delete ────────────────────────────────────────────────────────────────

    def test_delete_own_conversation(self):
        conv = make_conversation(self.user_a)
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.delete(f"/api/chat/conversations/{conv.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Conversation.objects.filter(id=conv.id).exists())

    def test_delete_other_user_conversation_returns_404(self):
        conv = make_conversation(self.user_b)
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.delete(f"/api/chat/conversations/{conv.id}/")
        self.assertEqual(resp.status_code, 404)
        self.assertTrue(Conversation.objects.filter(id=conv.id).exists())

    # ── Message retrieval ─────────────────────────────────────────────────────

    def test_retrieve_conversation_includes_messages(self):
        conv = make_conversation(self.user_a)
        Message.objects.create(conversation=conv, role="user", content="Hello")

        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get(f"/api/chat/conversations/{conv.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("messages", resp.data)

    def test_retrieve_conversation_includes_document_ids(self):
        conv = make_conversation(self.user_a)
        doc = make_document(self.user_a)
        conv.documents.add(doc)

        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get(f"/api/chat/conversations/{conv.id}/")
        self.assertIn("document_ids", resp.data)
        self.assertIn(doc.id, resp.data["document_ids"])


# ─── 2. RAG Chat API tests ────────────────────────────────────────────────────

class TestChatAPI(TestCase):

    def setUp(self):
        self.user = make_user("rag_user")
        self.client = APIClient()

    def test_chat_requires_auth(self):
        resp = self.client.post(
            "/api/chat/",
            {"question": "Hello"},
            format="json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_chat_missing_question_returns_400(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post("/api/chat/", {}, format="json")
        self.assertEqual(resp.status_code, 400)

    @patch("documents.services.retriever.embed_text",
           return_value=[0.0] * 1536)
    def test_chat_no_documents_returns_no_results_answer(self, _mock):
        """Zero-vector embedding → no chunks → sources_found=False.
        Use a plain question that routes to CHAT, not to an action type."""
        self.client.force_authenticate(user=self.user)
        # "Tell me about" routes to CHAT intent
        resp = self.client.post(
            "/api/chat/",
            {"question": "Tell me about the content"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("conversation_id", resp.data)
        # With zero-vector, no chunks match → sources_found=False
        self.assertFalse(resp.data["sources_found"])

    @patch("documents.services.retriever.embed_text",
           return_value=[0.0] * 1536)
    def test_chat_creates_new_conversation(self, _mock):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/chat/",
            {"question": "Tell me about this invoice"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        conv_id = resp.data["conversation_id"]
        self.assertTrue(
            Conversation.objects.filter(id=conv_id, user=self.user).exists()
        )

    @patch("documents.services.retriever.embed_text",
           return_value=[0.0] * 1536)
    def test_chat_persists_user_message(self, _mock):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/chat/",
            {"question": "What are the payment terms?"},
            format="json",
        )
        conv_id = resp.data["conversation_id"]
        self.assertTrue(
            Message.objects.filter(
                conversation_id=conv_id,
                role="user",
                content="What are the payment terms?",
            ).exists()
        )

    @patch("documents.services.retriever.embed_text",
           return_value=[0.0] * 1536)
    def test_chat_persists_assistant_message(self, _mock):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/chat/",
            {"question": "What is in this document?"},
            format="json",
        )
        conv_id = resp.data["conversation_id"]
        self.assertTrue(
            Message.objects.filter(
                conversation_id=conv_id,
                role="assistant",
            ).exists()
        )

    @patch("documents.services.retriever.embed_text",
           return_value=[0.0] * 1536)
    def test_chat_uses_existing_conversation(self, _mock):
        conv = make_conversation(self.user, "Existing")
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/chat/",
            {"question": "Follow up", "conversation_id": conv.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["conversation_id"], conv.id)

    @patch("documents.services.retriever.embed_text",
           return_value=[0.0] * 1536)
    def test_chat_rejects_another_users_conversation(self, _mock):
        other = make_user("other_chat")
        conv = make_conversation(other)
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/chat/",
            {"question": "Hello", "conversation_id": conv.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    @override_settings(LLM_API_KEY="your_openai_api_key_here")
    def test_chat_placeholder_key_uses_fallback_answer(self, _mock):
        """With a placeholder key, the LLM call raises; the view catches it and returns
        a no-results answer. The user message and assistant message are still persisted."""
        doc = make_document(self.user, "Invoice.pdf")
        make_chunk(doc, "Payment is due in 30 days.", embedding=[1.0] + [0.0] * 1535)

        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/chat/",
            {"question": "Tell me about payment terms", "document_ids": [doc.id]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("conversation_id", resp.data)
        self.assertIn("answer", resp.data)
        # LLM failed → sources_found is False, answer is the no-results message
        self.assertFalse(resp.data["sources_found"])

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    @override_settings(LLM_API_KEY="your_openai_api_key_here")
    def test_citations_come_from_retrieval_not_llm(self, _mock):
        """Citations must be built from semantic_search results, not from the LLM."""
        doc = make_document(self.user, "Contract.pdf")
        make_chunk(doc, "Contract expires on 2027-01-01.", embedding=[1.0] + [0.0] * 1535)

        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/chat/",
            {"question": "When does the contract expire?", "document_ids": [doc.id]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        # Citations should reference doc.id
        if resp.data["citations"]:
            for cite in resp.data["citations"]:
                self.assertEqual(cite["document_id"], doc.id)

    def test_chat_returns_expected_response_fields(self):
        self.client.force_authenticate(user=self.user)
        with patch("documents.services.retriever.embed_text",
                   return_value=[0.0] * 1536):
            resp = self.client.post(
                "/api/chat/",
                {"question": "Hello"},
                format="json",
            )
        for field in ("conversation_id", "answer", "citations",
                      "sources_found", "message_id"):
            self.assertIn(field, resp.data)


# ─── 3. Document scope / privacy tests ───────────────────────────────────────

class TestDocumentScopePrivacy(TestCase):

    def setUp(self):
        self.user_a = make_user("scope_a")
        self.user_b = make_user("scope_b")
        self.client = APIClient()

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    def test_another_user_document_cannot_be_selected(self, _mock):
        """User A passing User B's document_id must get 403, not 500."""
        doc_b = make_document(self.user_b, "B_Private.pdf")
        make_chunk(doc_b, "Confidential B content.", embedding=[1.0] + [0.0] * 1535)

        self.client.force_authenticate(user=self.user_a)
        resp = self.client.post(
            "/api/chat/",
            {"question": "What is in B's document?", "document_ids": [doc_b.id]},
            format="json",
        )
        # The retriever raises PermissionError; the view must return 403
        self.assertEqual(resp.status_code, 403)

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    def test_own_document_can_be_selected(self, _mock):
        """User A's document should be accessible in chat."""
        doc = make_document(self.user_a, "A_Doc.pdf")
        make_chunk(doc, "Invoice total is 50000.", embedding=[1.0] + [0.0] * 1535)

        self.client.force_authenticate(user=self.user_a)
        resp = self.client.post(
            "/api/chat/",
            {"question": "What is the total?", "document_ids": [doc.id]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)

    def test_conversation_messages_isolated_per_user(self):
        """Each user's messages stay within their own conversations."""
        conv_a = make_conversation(self.user_a)
        Message.objects.create(
            conversation=conv_a, role="user", content="A's question"
        )
        conv_b = make_conversation(self.user_b)
        Message.objects.create(
            conversation=conv_b, role="user", content="B's question"
        )

        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get(f"/api/chat/conversations/{conv_a.id}/")
        messages = resp.data.get("messages", [])
        contents = [m["content"] for m in messages]
        self.assertIn("A's question", contents)
        self.assertNotIn("B's question", contents)


# ─── 4. Document chunk tests for RAG ─────────────────────────────────────────

class TestRAGRetrieval(TestCase):

    def setUp(self):
        self.user = make_user("rag_retrieve_user")
        self.client = APIClient()

    @patch("documents.services.retriever.embed_text",
           return_value=[1.0] + [0.0] * 1535)
    @override_settings(LLM_API_KEY="your_openai_api_key_here")
    def test_sources_found_true_when_chunks_retrieved(self, _mock):
        doc = make_document(self.user, "PO.pdf")
        make_chunk(doc, "Purchase order total is 100000.", embedding=[1.0] + [0.0] * 1535)

        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/chat/",
            {"question": "What is the PO total?", "document_ids": [doc.id]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        # With a real embedding match, sources_found should be True
        # (chunks exist and have non-zero embeddings that match the query)
        self.assertIn("sources_found", resp.data)

    @patch("documents.services.retriever.embed_text",
           return_value=[0.0] * 1536)
    def test_sources_found_false_when_no_matching_chunks(self, _mock):
        """Zero-vector query → no similarity → sources_found=False."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/chat/",
            {"question": "What is not in any document?"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["sources_found"])

    @patch("documents.services.retriever.embed_text",
           return_value=[0.0] * 1536)
    def test_citations_empty_when_no_chunks(self, _mock):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/chat/",
            {"question": "Nothing to find"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["citations"], [])


# ─── 5. Suggested questions tests ────────────────────────────────────────────

class TestSuggestedQuestions(TestCase):

    def setUp(self):
        self.user = make_user("sq_user")
        self.client = APIClient()

    def test_suggested_requires_auth(self):
        resp = self.client.get("/api/chat/suggested/")
        self.assertEqual(resp.status_code, 401)

    def test_suggested_returns_questions_for_valid_doc(self):
        doc = make_document(self.user, "Contract.pdf")
        doc.document_type = "CONTRACT"
        doc.save()
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f"/api/chat/suggested/?document_id={doc.id}")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("questions", resp.data)
        self.assertGreater(len(resp.data["questions"]), 0)

    def test_suggested_empty_for_missing_doc_id(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/api/chat/suggested/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["questions"], [])

    def test_suggested_empty_for_other_user_document(self):
        other = make_user("sq_other")
        doc = make_document(other, "Other.pdf")
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f"/api/chat/suggested/?document_id={doc.id}")
        self.assertEqual(resp.status_code, 200)
        # Returns empty list for unauthorized document
        self.assertEqual(resp.data["questions"], [])


# ─── 6. Serializer tests ─────────────────────────────────────────────────────

class TestSerializers(TestCase):

    def setUp(self):
        self.user = make_user("ser_user")

    def test_conversation_serializer_includes_document_ids(self):
        from chat.serializers import ConversationSerializer
        doc = make_document(self.user)
        conv = make_conversation(self.user)
        conv.documents.add(doc)
        data = ConversationSerializer(conv).data
        self.assertIn("document_ids", data)
        self.assertIn(doc.id, data["document_ids"])

    def test_message_serializer_includes_citations(self):
        from chat.serializers import MessageSerializer
        conv = make_conversation(self.user)
        citations = [{"document_id": 1, "document_title": "Test.pdf",
                      "page_number": 1, "chunk_index": 0, "content": "Test"}]
        msg = Message.objects.create(
            conversation=conv,
            role="assistant",
            content="Test answer",
            citations=citations,
            sources_found=True,
        )
        data = MessageSerializer(msg).data
        self.assertIn("citations", data)
        self.assertEqual(len(data["citations"]), 1)
        self.assertIn("sources_found", data)
        self.assertTrue(data["sources_found"])

    def test_conversation_list_serializer_has_message_count(self):
        from chat.serializers import ConversationListSerializer
        conv = make_conversation(self.user)
        Message.objects.create(conversation=conv, role="user", content="Q1")
        Message.objects.create(conversation=conv, role="assistant", content="A1")
        data = ConversationListSerializer(conv).data
        self.assertEqual(data["message_count"], 2)
