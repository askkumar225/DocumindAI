/**
 * aiApi.ts — General AI HTTP service layer.
 *
 * Types are imported from types/ai.ts (single source of truth).
 * Exports:
 *   streamChat()  — SSE streaming via fetch + AbortController
 *   aiApi         — Axios-based REST helpers (CRUD)
 */

import api from "./api";
import { authStore } from "../store/authStore";
import type {
  AIConversation,
  AIConversationListItem,
  AIChatResponse,
  SSEEvent,
} from "../types/ai";

// Re-export types so existing imports keep working
export type {
  AIMessage,
  AIConversation,
  AIConversationListItem,
  AIChatResponse,
  SSEEvent,
} from "../types/ai";

// ─── API base ─────────────────────────────────────────────────────────────────

const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.PROD ? "/api" : "http://localhost:8000/api");

// ─── Streaming helper ─────────────────────────────────────────────────────────

/**
 * Opens a POST-based SSE stream to /api/ai/chat/stream/.
 *
 * Calls the supplied callbacks as events arrive:
 *   onMeta(conversationId)  — fired first; gives the conversation ID
 *   onChunk(text)           — fired for each text delta
 *   onDone(messageId)       — fired once the assistant message is persisted
 *   onError(text)           — fired on network or server errors
 *
 * Returns an AbortController. Call .abort() to cancel mid-stream.
 */
export function streamChat(
  message: string,
  conversationId: number | null,
  callbacks: {
    onMeta:  (conversationId: number) => void;
    onChunk: (text: string) => void;
    onDone:  (messageId: number) => void;
    onError: (text: string) => void;
  },
): AbortController {
  const controller = new AbortController();
  const token      = authStore.getAccessToken();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/chat/stream/`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:   JSON.stringify({ message, conversation_id: conversationId ?? null }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        // Handle 429 rate-limit explicitly
        if (res.status === 429) {
          callbacks.onError("Too many requests. Please wait a moment and try again.");
        } else {
          callbacks.onError(`Server error: ${res.status}`);
        }
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by "\n\n"
        const parts = buffer.split("\n\n");
        buffer      = parts.pop() ?? "";   // keep any incomplete trailing part

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json) continue;

          try {
            const evt = JSON.parse(json) as SSEEvent;
            if (evt.type === "meta")  callbacks.onMeta(evt.conversation_id);
            if (evt.type === "chunk") callbacks.onChunk(evt.text);
            if (evt.type === "done")  callbacks.onDone(evt.message_id);
            if (evt.type === "error") callbacks.onError(evt.text);
          } catch {
            // malformed JSON chunk — skip silently
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== "AbortError") {
        callbacks.onError("Connection lost. Please check your network and try again.");
      }
    }
  })();

  return controller;
}

// ─── REST helpers ─────────────────────────────────────────────────────────────

const aiApi = {
  /** Blocking chat — returns full answer in one JSON response. */
  chat: (message: string, conversationId?: number) =>
    api.post<AIChatResponse>("/ai/chat/", {
      message,
      conversation_id: conversationId ?? null,
    }),

  /** List all conversations for the current user (sidebar). */
  listConversations: () =>
    api.get<AIConversationListItem[]>("/ai/conversations/"),

  /** Create a new empty conversation. */
  createConversation: (title?: string) =>
    api.post<AIConversation>("/ai/conversations/", {
      title: title ?? "New Conversation",
    }),

  /** Fetch a single conversation with all its messages. */
  getConversation: (id: number) =>
    api.get<AIConversation>(`/ai/conversations/${id}/`),

  /** Rename a conversation. */
  renameConversation: (id: number, title: string) =>
    api.patch<AIConversation>(`/ai/conversations/${id}/`, { title }),

  /** Permanently delete a conversation. */
  deleteConversation: (id: number) =>
    api.delete(`/ai/conversations/${id}/`),

  /** Regenerate the last assistant response in a conversation. */
  regenerateResponse: (conversationId: number) =>
    api.post<AIChatResponse>(`/ai/conversations/${conversationId}/regenerate/`),
};

export default aiApi;
