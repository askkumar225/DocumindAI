/**
 * useChat.ts — All General AI conversation state + streaming logic.
 *
 * Extracted from AIChat.tsx so the page component is a thin orchestrator.
 *
 * Responsibilities:
 *   • Load / cache conversation list
 *   • Load messages for the active conversation
 *   • Send a message via SSE streaming
 *   • Handle regenerate (re-send last user message)
 *   • Stop an in-progress stream
 *   • New chat / select conversation / delete / rename
 *   • Error state with retryText so the UI can offer a one-click retry
 *
 * NOT responsible for:
 *   • Rendering anything
 *   • Navigation (caller handles navigate())
 *   • Auto-scrolling (caller handles a bottomRef)
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import aiApi, { streamChat } from "../services/aiApi";
import type {
  AIConversationListItem,
  AIMessage,
  ChatError,
  ChatStatus,
} from "../types/ai";

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UseChatReturn {
  // Data
  conversations:  AIConversationListItem[];
  activeId:       number | null;
  messages:       AIMessage[];
  streamingText:  string;
  status:         ChatStatus;
  chatError:      ChatError | null;

  // Input
  input:          string;
  setInput:       (v: string) => void;

  // Actions
  send:           (overrideText?: string) => void;
  stop:           () => void;
  retry:          () => void;
  regenerate:     () => void;
  newChat:        () => void;
  selectConv:     (id: number) => void;
  deleteConv:     (id: number) => void;
  renameConv:     (id: number, title: string) => void;
  loadConversations: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat(): UseChatReturn {
  const [conversations,  setConversations]  = useState<AIConversationListItem[]>([]);
  const [activeId,       setActiveId]       = useState<number | null>(null);
  const [messages,       setMessages]       = useState<AIMessage[]>([]);
  const [streamingText,  setStreamingText]  = useState("");
  const [status,         setStatus]         = useState<ChatStatus>("idle");
  const [chatError,      setChatError]      = useState<ChatError | null>(null);
  const [input,          setInput]          = useState("");

  // Refs — always hold the latest value without causing stale closures
  const streamingRef   = useRef("");          // mirrors streamingText for closures
  const abortRef       = useRef<AbortController | null>(null);
  const activeIdRef    = useRef<number | null>(null);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { streamingRef.current = streamingText; }, [streamingText]);

  // ── Load conversation list ─────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await aiApi.listConversations();
      setConversations(res.data);
    } catch {
      /* sidebar is non-critical — fail silently */
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load messages for active conversation ──────────────────────────────────
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }

    (async () => {
      try {
        const res = await aiApi.getConversation(activeId);
        setMessages(res.data.messages);
        setChatError(null);
      } catch {
        setChatError({ message: "Failed to load conversation.", retryText: "" });
      }
    })();
  }, [activeId]);

  // ── Core send function ─────────────────────────────────────────────────────
  function _doSend(text: string) {
    if (!text.trim() || status === "streaming") return;

    setChatError(null);
    setStatus("streaming");
    setStreamingText("");
    streamingRef.current = "";

    // Optimistic user bubble (temp negative ID)
    const tempId = -Date.now();
    const userMsg: AIMessage = {
      id: tempId, role: "user", content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    let convIdFromStream: number | null = activeIdRef.current;

    const ctrl = streamChat(text, activeIdRef.current, {
      onMeta: (cid) => {
        convIdFromStream = cid;
        if (!activeIdRef.current) {
          activeIdRef.current = cid;
          setActiveId(cid);
          // Optimistic sidebar entry
          setConversations((prev) => {
            if (prev.find((c) => c.id === cid)) return prev;
            return [
              {
                id: cid,
                title: text.slice(0, 60),
                message_count: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              ...prev,
            ];
          });
        }
      },

      onChunk: (chunk) => {
        streamingRef.current += chunk;
        setStreamingText((p) => p + chunk);
      },

      onDone: (msgId) => {
        const finalContent = streamingRef.current;
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          {
            id: msgId,
            role: "assistant",
            content: finalContent,
            created_at: new Date().toISOString(),
          },
        ]);
        setStreamingText("");
        setStatus("idle");
        // Refresh sidebar so title updates
        if (convIdFromStream) loadConversations();
      },

      onError: (msg) => {
        setChatError({ message: msg, retryText: text });
        setStreamingText("");
        setStatus("error");
        // Remove the optimistic user bubble on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      },
    });

    abortRef.current = ctrl;
  }

  // ── Public send ───────────────────────────────────────────────────────────
  function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    if (!overrideText) setInput(""); // clear input only when using the text field
    _doSend(text);
  }

  // ── Stop streaming ────────────────────────────────────────────────────────
  function stop() {
    abortRef.current?.abort();

    // Preserve whatever was streamed so far
    const partial = streamingRef.current;
    if (partial) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: partial + "\n\n*(generation stopped)*",
          created_at: new Date().toISOString(),
        },
      ]);
    }

    setStreamingText("");
    setStatus("idle");
  }

  // ── Retry after error ─────────────────────────────────────────────────────
  function retry() {
    if (!chatError?.retryText) return;
    const text = chatError.retryText;
    setChatError(null);
    _doSend(text);
  }

  // ── Regenerate last AI response ───────────────────────────────────────────
  function regenerate() {
    if (status === "streaming") return;

    // Find the last user message
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    // Remove the last AI message from local state so it re-generates
    setMessages((prev) => {
      const copy = [...prev];
      // Remove trailing assistant messages
      while (copy.length && copy[copy.length - 1].role === "assistant") {
        copy.pop();
      }
      return copy;
    });

    _doSend(lastUser.content);
  }

  // ── New chat ──────────────────────────────────────────────────────────────
  function newChat() {
    abortRef.current?.abort();
    activeIdRef.current = null;
    setActiveId(null);
    setMessages([]);
    setStreamingText("");
    setStatus("idle");
    setChatError(null);
    setInput("");
  }

  // ── Select conversation ───────────────────────────────────────────────────
  function selectConv(id: number) {
    if (status === "streaming") return; // don't switch mid-stream
    if (id === activeId) return;
    abortRef.current?.abort();
    setStreamingText("");
    setStatus("idle");
    setChatError(null);
    setActiveId(id);
  }

  // ── Delete conversation ───────────────────────────────────────────────────
  async function deleteConv(id: number) {
    try {
      await aiApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) newChat();
    } catch {
      /* silent */
    }
  }

  // ── Rename conversation ───────────────────────────────────────────────────
  async function renameConv(id: number, title: string) {
    try {
      await aiApi.renameConversation(id, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
    } catch {
      /* silent */
    }
  }

  return {
    conversations,
    activeId,
    messages,
    streamingText,
    status,
    chatError,
    input,
    setInput,
    send,
    stop,
    retry,
    regenerate,
    newChat,
    selectConv,
    deleteConv,
    renameConv,
    loadConversations,
  };
}
