/**
 * AIChat.tsx — General AI page (orchestrator).
 *
 * This file owns ONLY layout and wiring.
 * All state/streaming logic lives in hooks/useChat.ts.
 * All UI components live in components/generalai/.
 *
 * Layout:
 *  ┌────────────────┬──────────────────────────────────────────┐
 *  │  ChatSidebar   │  Header bar                              │
 *  │                ├──────────────────────────────────────────┤
 *  │  ← Hub         │  WelcomeScreen  OR  message list         │
 *  │  + New Chat    │                                          │
 *  │  [search]      │  TypingDots  (waiting for first chunk)   │
 *  │                │  streaming bubble (live chunks)          │
 *  │  TODAY         │  error banner + retry                    │
 *  │   • conv 1     │                                          │
 *  │  YESTERDAY     ├──────────────────────────────────────────┤
 *  │   • conv 2     │  ChatInput                               │
 *  └────────────────┴──────────────────────────────────────────┘
 */

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { useChat } from "../hooks/useChat";
import ChatSidebar   from "../components/generalai/ChatSidebar";
import ChatMessage   from "../components/generalai/ChatMessage";
import TypingDots    from "../components/generalai/TypingDots";
import WelcomeScreen from "../components/generalai/WelcomeScreen";
import ChatInput     from "../components/generalai/ChatInput";

import type { AIMessage } from "../types/ai";

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({
  message, onRetry,
}: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="max-w-3xl mx-auto rounded-2xl
                 bg-red-500/8 border border-red-500/20
                 px-5 py-4 flex items-start gap-3"
    >
      <span className="text-lg mt-0.5 flex-shrink-0">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-400">Something went wrong</p>
        <p className="text-xs text-red-400/70 mt-0.5 break-words">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg
                     bg-red-500/15 border border-red-500/30 text-red-400
                     hover:bg-red-500/25 transition-colors"
        >
          Retry
        </button>
      )}
    </motion.div>
  );
}

// ─── Header bar ───────────────────────────────────────────────────────────────

function ChatHeader({
  title, isStreaming,
}: { title: string; isStreaming: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-6 py-3.5 flex-shrink-0
                 border-b border-slate-800/50 bg-[#060a18]/90 backdrop-blur-sm"
    >
      <div>
        <h1 className="text-sm font-black text-white tracking-tight">
          ✨ General AI
        </h1>
        <p className="text-xs text-slate-600 mt-0.5 truncate max-w-xs font-medium">
          {title}
        </p>
      </div>

      <AnimatePresence>
        {isStreaming && (
          <motion.div
            className="flex items-center gap-2 text-xs font-semibold text-violet-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            Generating…
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AIChat() {
  const [searchParams] = useSearchParams();
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
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
  } = useChat();

  // ── Pre-fill input from hub search bar (?q=...) ───────────────────────────
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setInput(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, status]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const isStreaming   = status === "streaming";
  const showWelcome   = messages.length === 0 && !isStreaming && !chatError;
  const showTyping    = isStreaming && streamingText === "";

  // Build the live streaming bubble (shown while chunks arrive)
  const streamingMsg: AIMessage | null = streamingText
    ? {
        id: -1,
        role: "assistant",
        content: streamingText,
        created_at: new Date().toISOString(),
        streaming: true,
      }
    : null;

  // Active conversation title for the header
  const activeTitle = activeId
    ? (conversations.find((c) => c.id === activeId)?.title ?? "Conversation")
    : "New conversation";

  // Index of the last persisted AI message (for regenerate button)
  const lastAIIndex = [...messages]
    .map((m, i) => ({ m, i }))
    .reverse()
    .find(({ m }) => m.role === "assistant")?.i ?? -1;

  return (
    <div className="flex h-full bg-[#060a18] overflow-hidden">

      {/* ── Left sidebar ─────────────────────────────────────── */}
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConv}
        onNewChat={newChat}
        onDelete={deleteConv}
        onRename={renameConv}
      />

      {/* ── Right: chat area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Header */}
        <ChatHeader title={activeTitle} isStreaming={isStreaming} />

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6">
          {showWelcome ? (
            <WelcomeScreen onSuggestion={(p) => send(p)} />
          ) : (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto">

              {/* Persisted messages */}
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  isLastAI={idx === lastAIIndex && !isStreaming}
                  onRegenerate={idx === lastAIIndex ? regenerate : undefined}
                />
              ))}

              {/* Typing indicator — before first chunk */}
              <AnimatePresence>
                {showTyping && <TypingDots />}
              </AnimatePresence>

              {/* Live streaming bubble */}
              {streamingMsg && (
                <ChatMessage msg={streamingMsg} />
              )}

              {/* Error banner */}
              <AnimatePresence>
                {chatError && (
                  <ErrorBanner
                    message={chatError.message}
                    onRetry={chatError.retryText ? retry : (() => {})}
                  />
                )}
              </AnimatePresence>

              {/* Scroll anchor */}
              <div ref={bottomRef} className="h-2" />
            </div>
          )}

          {/* Scroll anchor for welcome screen too */}
          {showWelcome && <div ref={bottomRef} />}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 border-t border-slate-800/40">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => send()}
            onStop={stop}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
