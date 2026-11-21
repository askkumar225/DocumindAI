/**
 * ChatInput.tsx — The bottom message input bar.
 *
 * Features:
 *  • Auto-resizing textarea (up to 200 px)
 *  • Enter → send, Shift+Enter → new line
 *  • Animated send button (disabled when empty)
 *  • Red stop button while AI is streaming
 *  • Glow effect on focus / when text is present
 */

import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  placeholder = "Ask anything…",
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && !disabled && value.trim()) onSend();
    }
  }

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;
  const hasFocus = value.trim().length > 0;

  return (
    <div className="px-4 md:px-8 pb-6 pt-3">
      {/* Input wrapper */}
      <div
        className="relative max-w-3xl mx-auto rounded-2xl
                   transition-all duration-300"
        style={{
          background: "rgba(12,17,36,0.92)",
          border: `1px solid ${hasFocus
            ? "rgba(99,102,241,0.5)"
            : "rgba(99,102,241,0.18)"}`,
          boxShadow: hasFocus
            ? "0 0 32px 4px rgba(99,102,241,0.18), 0 8px 32px rgba(0,0,0,0.4)"
            : "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={1}
          disabled={isStreaming || disabled}
          className="w-full bg-transparent text-white placeholder-slate-600
                     text-sm pl-5 pr-14 pt-4 pb-4 resize-none outline-none
                     leading-relaxed font-medium disabled:cursor-not-allowed"
          style={{ maxHeight: 200 }}
          aria-label="Chat input"
        />

        {/* Send / Stop button */}
        <div className="absolute right-3 bottom-3">
          {isStreaming ? (
            /* ── Stop button ── */
            <motion.button
              onClick={onStop}
              title="Stop generating"
              className="w-9 h-9 rounded-xl flex items-center justify-center
                         bg-red-500/15 border border-red-500/35 text-red-400
                         hover:bg-red-500/25 transition-colors"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
                <rect x="1.5" y="1.5" width="8" height="8" rx="1.5"/>
              </svg>
            </motion.button>
          ) : (
            /* ── Send button ── */
            <motion.button
              onClick={onSend}
              disabled={!canSend}
              title="Send message"
              className={`w-9 h-9 rounded-xl flex items-center justify-center
                          transition-all duration-200
                          ${canSend
                            ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                            : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}
              whileHover={canSend ? { scale: 1.08 } : {}}
              whileTap={canSend ? { scale: 0.94 } : {}}
            >
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <path d="M16 9L2 2l3 7-3 7 14-7z" fill="currentColor"/>
              </svg>
            </motion.button>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-center text-slate-700 text-xs mt-2.5 font-medium select-none">
        Enter&nbsp;to&nbsp;send&nbsp;·&nbsp;Shift+Enter&nbsp;for&nbsp;new&nbsp;line
        &nbsp;·&nbsp;General&nbsp;AI&nbsp;can&nbsp;make&nbsp;mistakes
      </p>
    </div>
  );
}
