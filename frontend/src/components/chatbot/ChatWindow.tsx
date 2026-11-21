/**
 * ChatWindow
 *
 * The main chat panel.
 * - Frosted glass design matching auth pages
 * - Quick-question chips
 * - Auto-scroll to latest message
 * - Typing indicator (AnimatePresence)
 * - Graceful error handling
 * - Hits POST /api/chat/public/ when unauthenticated
 * - Hits POST /api/chat/ (TODO: full RAG) when authenticated
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { authStore } from "../../store/authStore";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "What is DocuMind AI?",
  "What documents can I upload?",
  "How does AI chat work?",
  "How does document search work?",
  "Is my data secure?",
];

const API_BASE = "http://localhost:8000/api";

interface ChatWindowProps {
  onClose: () => void;
}

export default function ChatWindow({ onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm DocuMind AI. I can answer questions about features, document management, and how everything works. What would you like to know?",
    },
  ]);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [, setError]       = useState<string | null>(null);
  const bottomRef               = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || typing) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content }]);
    setTyping(true);

    try {
      const isAuth = authStore.isAuthenticated();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (isAuth) {
        const token = authStore.getAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await axios.post<{ answer: string }>(
        `${API_BASE}/chat/public/`,
        { message: content },
        { headers, timeout: 15000 }
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.answer },
      ]);
    } catch (err: unknown) {
      const errObj = err as { request?: unknown; response?: unknown };
      const msg = errObj.request && !errObj.response
        ? "Cannot reach DocuMind AI server. Please try again."
        : "Something went wrong. Please try again.";

      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: msg },
      ]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="
        fixed bottom-24 right-6 z-50
        w-[360px] max-w-[calc(100vw-24px)]
        h-[540px] max-h-[80vh]
        flex flex-col
        bg-slate-900/90 backdrop-blur-2xl
        border border-white/10
        rounded-2xl shadow-2xl shadow-black/50
        overflow-hidden
      "
      role="dialog"
      aria-label="DocuMind AI Chat Assistant"
    >
      {/* Top edge highlight */}
      <div className="absolute top-0 left-8 right-8 h-px
                      bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3
                      border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Pulsing orb */}
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
            <div className="relative w-8 h-8 rounded-full
                            bg-gradient-to-br from-indigo-500 to-violet-600
                            flex items-center justify-center text-sm shadow-md">
              🤖
            </div>
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">DocuMind AI</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-slate-400 text-[10px]">AI Assistant · Online</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close chat"
          className="w-7 h-7 rounded-lg flex items-center justify-center
                     text-slate-400 hover:text-white hover:bg-white/10
                     transition-all duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3
                      scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}

        <AnimatePresence>
          {typing && <TypingIndicator key="typing" />}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Quick questions ──────────────────────────────────────────────── */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex-shrink-0">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-2">
            Quick questions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={typing}
                className="text-xs text-indigo-300 border border-indigo-500/30
                           bg-indigo-500/10 hover:bg-indigo-500/20
                           rounded-full px-2.5 py-1 transition-all duration-150
                           hover:border-indigo-400/50 disabled:opacity-50
                           disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => sendMessage()}
          disabled={typing}
        />
      </div>
    </motion.div>
  );
}
