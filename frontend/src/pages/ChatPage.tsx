/**
 * ChatPage — Universal AI Document Chat workspace with AI Command Center.
 *
 * Features:
 *   - Upload docs directly from chat input
 *   - Multi-document context
 *   - Suggested questions + action quick-buttons
 *   - Animated message bubbles with citations
 *   - Rich action result rendering (documents, risks, approvals, summary, extraction)
 *   - Confirmation dialog for destructive actions
 *   - Multi-turn conversation memory
 *   - Permission-aware RAG + Intent routing
 *   - Processing polling
 */

import {
  useEffect, useRef, useState, useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import api from "../services/api";
import { useAuth } from "../store/authStore";
import type { ChatMessage, Citation, Conversation, UploadingDoc } from "../types/chat";
import type { DocumentListItem } from "../types/document";
import ChatMessageBubble from "../components/chat/ChatMessageBubble";
import SuggestedQuestions from "../components/chat/SuggestedQuestions";
import UploadProgress from "../components/chat/UploadProgress";
import ActionButtons from "../components/ai/ActionButtons";
import ConfirmationDialog from "../components/ai/ConfirmationDialog";

// ─── Constants ─────────────────────────────────────────────────────────────

const POLL_MS = 3000;

// ─── Helpers ───────────────────────────────────────────────────────────────

function isProcessing(doc: DocumentListItem) {
  return (
    doc.status === "UPLOADED" ||
    doc.status === "PROCESSING" ||
    doc.ai_status === "PENDING" ||
    doc.ai_status === "PROCESSING"
  );
}

function isReady(doc: DocumentListItem) {
  return doc.status === "PROCESSED" || doc.status === "APPROVED";
}

function docIcon(type: string) {
  const map: Record<string, string> = {
    CONTRACT: "📝", INVOICE: "🧾", PURCHASE_ORDER: "📦",
    RECEIPT: "🧾", REPORT: "📊", POLICY: "📋", OTHER: "📄",
  };
  return map[type] ?? "📄";
}

// ─── Sidebar conversation item ──────────────────────────────────────────────

function ConvItem({
  conv, active, onClick, onDelete,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg
                  cursor-pointer transition-all text-sm
                  ${active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"}`}
    >
      <span className="text-base flex-shrink-0">💬</span>
      <span className="flex-1 truncate font-medium">{conv.title}</span>
      <button
        onClick={onDelete}
        className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
                    w-5 h-5 flex items-center justify-center rounded hover:bg-red-100
                    ${active ? "text-indigo-200 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
        aria-label="Delete conversation"
      >
        ×
      </button>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId,  setActiveConvId]  = useState<number | null>(null);

  // Messages for the active conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Documents
  const [documents,     setDocuments]     = useState<DocumentListItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [suggestedQs,   setSuggestedQs]   = useState<string[]>([]);

  // Upload state
  const [uploading, setUploading] = useState<UploadingDoc[]>([]);

  // Input
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Confirmation dialog for destructive actions
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [confirmPrompt, setConfirmPrompt] = useState("");
  const [pendingConfirmFn, setPendingConfirmFn] = useState<(() => void) | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load conversations + documents on mount ───────────────────────────────
  useEffect(() => {
    fetchConversations();
    fetchDocuments();
  }, []);

  // ── Poll documents while any are processing ───────────────────────────────
  useEffect(() => {
    const anyProcessing = documents.some(isProcessing) || uploading.some(
      (u) => u.stage === "processing"
    );
    if (anyProcessing && !pollRef.current) {
      pollRef.current = setInterval(fetchDocuments, POLL_MS);
    }
    if (!anyProcessing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [documents, uploading]);

  // ── Update uploading-doc stages when documents refresh ───────────────────
  useEffect(() => {
    setUploading((prev) =>
      prev.map((u) => {
        if (u.stage !== "processing" || !u.documentId) return u;
        const serverDoc = documents.find((d) => d.id === u.documentId);
        if (!serverDoc) return u;
        if (isReady(serverDoc))     return { ...u, stage: "ready",   progress: 100 };
        if (serverDoc.status === "FAILED") return { ...u, stage: "error", error: "Processing failed" };
        return { ...u, stage: "processing", progress: 60 };
      })
    );
  }, [documents]);

  // ── Fetch suggested questions when a single doc is selected ──────────────
  useEffect(() => {
    if (selectedDocIds.length === 1) {
      api.get(`/chat/suggested/?document_id=${selectedDocIds[0]}`)
        .then((r) => setSuggestedQs(r.data.questions ?? []))
        .catch(() => setSuggestedQs([]));
    } else {
      setSuggestedQs([]);
    }
  }, [selectedDocIds]);

  // ─── Data fetchers ─────────────────────────────────────────────────────────

  async function fetchConversations() {
    try {
      const res = await api.get<Conversation[]>("/chat/conversations/");
      setConversations(res.data);
    } catch { /* ignore */ }
  }

  async function fetchDocuments() {
    try {
      const res = await api.get<DocumentListItem[]>("/documents/");
      setDocuments(res.data);
    } catch { /* ignore */ }
  }

  async function loadConversation(id: number) {
    try {
      const res = await api.get<{ messages: ChatMessage[]; document_ids: number[] }>(
        `/chat/conversations/${id}/`
      );
      setMessages(res.data.messages);
      setSelectedDocIds(res.data.document_ids);
      setActiveConvId(id);
    } catch { /* ignore */ }
  }

  // ─── New conversation ──────────────────────────────────────────────────────

  function startNewConversation() {
    setActiveConvId(null);
    setMessages([]);
    setSelectedDocIds([]);
    setSuggestedQs([]);
    setInput("");
  }

  // ─── Delete conversation ───────────────────────────────────────────────────

  async function deleteConversation(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    try {
      await api.delete(`/chat/conversations/${id}/`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) startNewConversation();
    } catch { /* ignore */ }
  }

  // ─── Document selection ────────────────────────────────────────────────────

  function toggleDoc(id: number) {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  // ─── File upload ───────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";

    for (const file of files) {
      const tempId = `upload-${Date.now()}-${Math.random()}`;

      setUploading((prev) => [
        ...prev,
        { id: tempId, name: file.name, stage: "uploading", progress: 10 },
      ]);

      try {
        const form = new FormData();
        form.append("title", file.name);
        form.append("file", file);

        setUploading((prev) =>
          prev.map((u) => u.id === tempId ? { ...u, progress: 40 } : u)
        );

        const res = await api.post<{ id: number }>("/documents/upload/", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const docId = res.data.id;

        setUploading((prev) =>
          prev.map((u) => u.id === tempId
            ? { ...u, stage: "processing", progress: 60, documentId: docId }
            : u
          )
        );

        // Auto-select the newly uploaded doc
        setSelectedDocIds((prev) =>
          prev.includes(docId) ? prev : [...prev, docId]
        );

        fetchDocuments();
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { file?: string[] } } })
          ?.response?.data?.file?.[0] ?? "Upload failed.";
        setUploading((prev) =>
          prev.map((u) => u.id === tempId
            ? { ...u, stage: "error", error: msg }
            : u
          )
        );
      }
    }

    // Auto-clear completed/errored items after 5 s
    setTimeout(() => {
      setUploading((prev) =>
        prev.filter((u) => u.stage === "processing")
      );
    }, 5000);
  }

  // ─── Send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    setInput("");
    setSending(true);

    // Optimistic user bubble
    const optimisticUser: ChatMessage = { role: "user", content };
    const optimisticAI:   ChatMessage = { role: "assistant", content: "", pending: true };

    setMessages((prev) => [...prev, optimisticUser, optimisticAI]);

    try {
      const res = await api.post<{
        conversation_id: number;
        answer: string;
        citations: Citation[];
        sources_found: boolean;
        message_id: number;
        action_type: string;
        result_type: string;
        action_data: Record<string, unknown>;
        redirect: string;
        needs_confirmation: boolean;
        confirmation_prompt: string;
      }>("/chat/", {
        question:        content,
        conversation_id: activeConvId ?? undefined,
        document_ids:    selectedDocIds,
      });

      const {
        conversation_id, answer, citations, sources_found, message_id,
        action_type, result_type, action_data, redirect,
        needs_confirmation, confirmation_prompt,
      } = res.data;

      const assistantMsg: ChatMessage = {
        id:           message_id,
        role:         "assistant",
        content:      answer,
        citations,
        sources_found,
        action_type,
        result_type,
        action_data,
        redirect,
        needs_confirmation,
        confirmation_prompt,
      };

      // Replace optimistic bubble with real answer
      setMessages((prev) => [...prev.slice(0, -1), assistantMsg]);

      // If action needs confirmation, show dialog
      if (needs_confirmation && confirmation_prompt) {
        setConfirmPrompt(confirmation_prompt);
        setConfirmOpen(true);
        // In a real implementation, pendingConfirmFn would execute the confirmed action
        setPendingConfirmFn(() => () => {
          setConfirmOpen(false);
        });
      }

      // Navigate if redirect provided
      if (redirect && !needs_confirmation) {
        setTimeout(() => navigate(redirect), 1200);
      }

      // Update conversation ID + list
      if (!activeConvId) {
        setActiveConvId(conversation_id);
        fetchConversations();
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          error: true,
          sources_found: false,
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, activeConvId, selectedDocIds]);

  // ── Ask AI about a specific document from an action result ─────────────────
  function handleAskAI(docId: number, title: string) {
    setSelectedDocIds([docId]);
    setInput(`Tell me about ${title}`);
  }

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ─── Derived state ─────────────────────────────────────────────────────────

  const readyDocs      = documents.filter(isReady);
  const processingDocs = documents.filter(isProcessing);
  const hasMessages    = messages.length > 0;

  const selectedDocs   = readyDocs.filter((d) => selectedDocIds.includes(d.id));
  const canSend        = input.trim().length > 0 && !sending;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">

      {/* ── Left sidebar ───────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-shrink-0 bg-white border-r border-gray-200
                       flex flex-col overflow-hidden"
          >
            {/* New chat */}
            <div className="p-3 border-b border-gray-100">
              <button
                onClick={startNewConversation}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg
                           bg-indigo-600 text-white text-sm font-medium
                           hover:bg-indigo-700 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round"/>
                </svg>
                New Chat
              </button>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {/* History section */}
              {conversations.length > 0 && (
                <div className="px-2 pt-3 pb-2">
                  <p className="text-[10px] font-semibold text-gray-400
                                uppercase tracking-wider px-2 mb-1">
                    Conversations
                  </p>
                  <div className="space-y-0.5">
                    {conversations.map((c) => (
                      <ConvItem
                        key={c.id}
                        conv={c}
                        active={c.id === activeConvId}
                        onClick={() => loadConversation(c.id)}
                        onDelete={(e) => deleteConversation(e, c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Documents section */}
              <div className="px-2 pt-3 pb-4 border-t border-gray-100 mt-2">
                <div className="flex items-center justify-between px-2 mb-2">
                  <p className="text-[10px] font-semibold text-gray-400
                                uppercase tracking-wider">
                    Documents ({readyDocs.length})
                  </p>
                  <button
                    onClick={() => navigate("/upload")}
                    className="text-[10px] text-indigo-600 hover:underline font-medium"
                  >
                    + Upload
                  </button>
                </div>

                {/* Processing badge */}
                {processingDocs.length > 0 && (
                  <div className="mx-2 mb-2 px-2.5 py-1.5 bg-yellow-50
                                  border border-yellow-200 rounded-lg">
                    <p className="text-[10px] text-yellow-700 animate-pulse">
                      ● {processingDocs.length} processing…
                    </p>
                  </div>
                )}

                {readyDocs.length === 0 && processingDocs.length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-gray-400">
                    No documents yet.
                    <br />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-indigo-500 hover:underline mt-1 block mx-auto"
                    >
                      Upload one now
                    </button>
                  </div>
                )}

                {readyDocs.map((doc) => {
                  const selected = selectedDocIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => toggleDoc(doc.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2
                                  rounded-lg text-left text-xs transition-all mb-0.5
                                  ${selected
                                    ? "bg-indigo-50 border border-indigo-200 text-indigo-700"
                                    : "text-gray-600 hover:bg-gray-50 border border-transparent"}`}
                    >
                      <span>{docIcon(doc.document_type)}</span>
                      <span className="flex-1 truncate font-medium">{doc.title}</span>
                      {selected && (
                        <span className="flex-shrink-0 w-4 h-4 rounded-full
                                         bg-indigo-600 flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4l1.5 1.5 3-3" stroke="white"
                                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main chat area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Chat toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white
                        border-b border-gray-200 flex-shrink-0">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="7.25" width="14" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="11.5" width="14" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
          </button>

          {/* Context pills */}
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {selectedDocs.length === 0 ? (
              <span className="text-xs text-gray-400 italic">
                Select documents from the sidebar or ask a general question
              </span>
            ) : (
              selectedDocs.map((doc) => (
                <span key={doc.id}
                      className="inline-flex items-center gap-1 text-xs
                                 bg-indigo-100 text-indigo-700 px-2.5 py-1
                                 rounded-full font-medium">
                  {docIcon(doc.document_type)} {doc.title}
                  <button
                    onClick={() => toggleDoc(doc.id)}
                    className="ml-0.5 hover:text-indigo-900"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          {/* AI indicator */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            DocuMind AI
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            /* Welcome state */
            <div className="h-full flex flex-col items-center justify-center
                            pb-8 px-4 gap-6">
              {/* Orb */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4
                                bg-gradient-to-br from-indigo-500 to-violet-600
                                flex items-center justify-center text-2xl
                                shadow-[0_0_30px_rgba(99,102,241,0.4)]
                                animate-pulse">
                  🤖
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  DocuMind AI
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {selectedDocs.length > 0
                    ? `Ready to answer questions about ${selectedDocs.length} document${selectedDocs.length > 1 ? "s" : ""}`
                    : "Upload a document or ask a general question to get started"}
                </p>
              </div>

              {/* Suggested questions */}
              <SuggestedQuestions
                questions={suggestedQs}
                onSelect={sendMessage}
                documentCount={selectedDocs.length}
              />
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
              {messages.map((msg, i) => (
                <ChatMessageBubble key={msg.id ?? i} message={msg} onAskAI={handleAskAI} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Upload progress */}
        <div className="max-w-3xl mx-auto w-full">
          <UploadProgress docs={uploading} />
        </div>

        {/* Action quick-buttons — shown when no messages yet */}
        {!hasMessages && (
          <ActionButtons onSelect={(cmd) => { setInput(cmd); }} disabled={sending} />
        )}

        {/* Input bar */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2
                            bg-white border border-gray-300 rounded-2xl
                            shadow-sm hover:border-indigo-400 focus-within:border-indigo-500
                            focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]
                            transition-all duration-200 px-3 py-2.5">

              {/* File attach */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.png,.jpg,.jpeg"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                           rounded-xl text-gray-400 hover:text-indigo-600
                           hover:bg-indigo-50 transition-all duration-150"
                aria-label="Upload document"
                title="Upload document"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 13h12M9 3v8M6 6l3-3 3 3"
                        stroke="currentColor" strokeWidth="1.6"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Text input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                placeholder={
                  selectedDocs.length > 0
                    ? "Ask anything about your documents…"
                    : "Ask DocuMind AI anything…"
                }
                className="flex-1 bg-transparent text-sm text-gray-800
                           placeholder:text-gray-400 outline-none resize-none
                           disabled:opacity-60 py-1"
              />

              {/* Send */}
              <button
                onClick={() => sendMessage()}
                disabled={!canSend}
                aria-label="Send message"
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center
                            rounded-xl transition-all duration-150
                            ${canSend
                              ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor"/>
                </svg>
              </button>
            </div>

            <p className="text-center text-[10px] text-gray-300 mt-1.5">
              DocuMind AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation dialog for destructive AI actions */}
      <ConfirmationDialog
        open={confirmOpen}
        prompt={confirmPrompt}
        onConfirm={() => {
          if (pendingConfirmFn) pendingConfirmFn();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
