/**
 * chatApi — chat and conversation service layer.
 */

import api from "./api";
import type { ChatMessage, Conversation } from "../types/chat";

export interface ChatRequest {
  question:        string;
  conversation_id?: number;
  document_ids?:   number[];
}

export interface ChatApiResponse {
  conversation_id:    number;
  answer:             string;
  citations:          unknown[];
  sources_found:      boolean;
  message_id:         number;
  action_type:        string;
  result_type:        string;
  action_data:        Record<string, unknown>;
  redirect:           string;
  needs_confirmation: boolean;
  confirmation_prompt: string;
}

const chatApi = {
  /** Send a message — routes through intent detection + RAG. */
  sendMessage: (data: ChatRequest) =>
    api.post<ChatApiResponse>("/chat/", data),

  /** Public (unauthenticated) product assistant. */
  publicChat: (message: string) =>
    api.post<{ answer: string }>("/chat/public/", { message }),

  /** List all conversations for the current user. */
  listConversations: () =>
    api.get<Conversation[]>("/chat/conversations/"),

  /** Get a conversation with all messages. */
  getConversation: (id: number) =>
    api.get<Conversation & { messages: ChatMessage[] }>(`/chat/conversations/${id}/`),

  /** Delete a conversation. */
  deleteConversation: (id: number) =>
    api.delete(`/chat/conversations/${id}/`),

  /** Rename a conversation. */
  renameConversation: (id: number, title: string) =>
    api.patch(`/chat/conversations/${id}/`, { title }),

  /** Get suggested questions for a document. */
  getSuggestedQuestions: (documentId: number) =>
    api.get<{ questions: string[] }>(`/chat/suggested/?document_id=${documentId}`),
};

export default chatApi;
