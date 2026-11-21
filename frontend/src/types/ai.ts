/**
 * types/ai.ts — All General AI TypeScript types
 *
 * Single source of truth for the General AI module.
 * Import from here, not from aiApi.ts or component files.
 */

// ─── Message ──────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface AIMessage {
  /** Positive = persisted server ID. Negative = optimistic temp ID. */
  id: number;
  role: MessageRole;
  content: string;
  created_at: string;
  /** True while this message is being streamed live */
  streaming?: boolean;
}

// ─── Conversation ─────────────────────────────────────────────────────────────

export interface AIConversation {
  id: number;
  title: string;
  messages: AIMessage[];
  created_at: string;
  updated_at: string;
}

/** Lightweight item used in the sidebar list */
export interface AIConversationListItem {
  id: number;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface AIChatRequest {
  message: string;
  conversation_id?: number | null;
}

export interface AIChatResponse {
  conversation_id: number;
  answer: string;
  message_id: number;
}

// ─── SSE streaming events ─────────────────────────────────────────────────────

export type SSEEvent =
  | { type: "meta";  conversation_id: number }
  | { type: "chunk"; text: string }
  | { type: "done";  message_id: number }
  | { type: "error"; text: string };

// ─── UI state ─────────────────────────────────────────────────────────────────

export type ChatStatus =
  | "idle"         // waiting for user input
  | "streaming"    // AI response streaming in
  | "error";       // last request failed

export interface ChatError {
  message: string;
  /** The user message that caused the error — used for retry */
  retryText: string;
}

// ─── Message feedback ─────────────────────────────────────────────────────────

export type Feedback = "up" | "down" | null;

export interface MessageFeedback {
  [messageId: number]: Feedback;
}

// ─── Suggestion chip ─────────────────────────────────────────────────────────

export interface Suggestion {
  icon: string;
  label: string;
  prompt: string;
}
