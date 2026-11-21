/**
 * ChatMessage
 *
 * A single chat bubble — user (right) or assistant (left).
 * Animates in with a fade + slide-up.
 */

import { motion } from "framer-motion";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full
                        bg-gradient-to-br from-indigo-500 to-violet-600
                        flex items-center justify-center text-xs shadow-md">
          🤖
        </div>
      )}

      {/* Bubble */}
      <div
        className={`
          max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-br-sm"
            : "bg-white/8 border border-white/10 text-slate-200 rounded-bl-sm"
          }
        `}
      >
        {content}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full
                        bg-white/10 border border-white/20
                        flex items-center justify-center text-xs">
          👤
        </div>
      )}
    </motion.div>
  );
}
