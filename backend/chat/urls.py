"""
URL configuration for the chat app.

    POST   /api/chat/                          — RAG chat (authenticated)
    GET    /api/chat/conversations/            — list conversations
    GET    /api/chat/conversations/{id}/       — get conversation + messages
    DELETE /api/chat/conversations/{id}/       — delete conversation
    GET    /api/chat/suggested/                — suggested questions for a document
    POST   /api/chat/public/                   — public product assistant (no auth)
"""

from django.urls import path
from .views import (
    ChatView,
    ConversationListView,
    ConversationDetailView,
    SuggestedQuestionsView,
    PublicChatView,
)

urlpatterns = [
    path("chat/",                         ChatView.as_view(),               name="chat"),
    path("chat/conversations/",           ConversationListView.as_view(),   name="chat-conversations"),
    path("chat/conversations/<int:pk>/",  ConversationDetailView.as_view(), name="chat-conversation-detail"),
    path("chat/suggested/",               SuggestedQuestionsView.as_view(), name="chat-suggested"),
    path("chat/public/",                  PublicChatView.as_view(),         name="chat-public"),
]
