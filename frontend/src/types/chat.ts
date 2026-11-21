// ─── Chat types ───────────────────────────────────────────────────────────────

export interface Citation {
  document_id: number;
  document_title: string;
  page_number: number | null;
  chunk_index: number;
  content: string;
}

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  sources_found?: boolean;
  created_at?: string;
  // optimistic — true while waiting for server response
  pending?: boolean;
  error?: boolean;
  // AI Action fields — populated for non-RAG action responses
  action_type?: string;
  result_type?: string;
  action_data?: Record<string, unknown>;
  redirect?: string;
  needs_confirmation?: boolean;
  confirmation_prompt?: string;
}

export interface Conversation {
  id: number;
  title: string;
  document_ids: number[];
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}

export interface ChatResponse {
  conversation_id: number;
  answer: string;
  citations: Citation[];
  sources_found: boolean;
  message_id: number;
  // Action fields
  action_type: string;
  result_type: string;
  action_data: Record<string, unknown>;
  redirect: string;
  needs_confirmation: boolean;
  confirmation_prompt: string;
}

export interface UploadingDoc {
  id: string;           // temp ID before server responds
  name: string;
  stage: "uploading" | "processing" | "ready" | "error";
  progress: number;     // 0-100
  documentId?: number;  // server ID once uploaded
  error?: string;
}
