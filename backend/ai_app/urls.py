from django.urls import path
from .views import (
    AIChatView,
    AIChatStreamView,
    AIConversationDetailView,
    AIConversationListView,
    AIRegenerateView,
)

urlpatterns = [
    # Chat endpoints
    path("ai/chat/",                              AIChatView.as_view(),             name="ai-chat"),
    path("ai/chat/stream/",                       AIChatStreamView.as_view(),       name="ai-chat-stream"),

    # Conversation management
    path("ai/conversations/",                     AIConversationListView.as_view(), name="ai-conversations"),
    path("ai/conversations/<int:pk>/",            AIConversationDetailView.as_view(),name="ai-conversation-detail"),

    # Regenerate last AI response
    path("ai/conversations/<int:pk>/regenerate/", AIRegenerateView.as_view(),       name="ai-regenerate"),
]
