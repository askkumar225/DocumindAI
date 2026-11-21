/**
 * ChatMessageBubble — renders a single chat turn with citations and action results.
 */

import { motion } from "framer-motion";
import type { ChatMessage } from "../../types/chat";
import SourceCard from "./SourceCard";
import ActionResultRenderer from "../ai/ActionResultRenderer";

interface Props {
  message: ChatMessage;
  onAskAI?: (docId: number, title: string) => void;
}

export default function ChatMessageBubble({ message, onAskAI }: Props) {
  const isUser = message.role === "user";
  const hasCitations = (message.citations?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1.5`}
    >
      {/* Bubble */}
      <div className={`flex items-end gap-2 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center
                         justify-center text-xs font-bold shadow-sm
                         ${isUser
                           ? "bg-indigo-600 text-white"
                           : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                         }`}>
          {isUser ? "U" : "🤖"}
        </div>

        {/* Content */}
        <div className={`
          rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
          ${isUser
            ? "bg-indigo-600 text-white rounded-br-sm"
            : message.error
              ? "bg-red-50 border border-red-200 text-red-700 rounded-bl-sm"
              : message.pending
                ? "bg-gray-100 text-gray-500 rounded-bl-sm"
                : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
          }
        `}>
          {message.pending ? (
            <div className="flex items-center gap-2">
              <span>Thinking</span>
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>
      </div>

      {/* Citations */}
      {!isUser && hasCitations && !message.pending && (
        <div className="w-full max-w-[85%] ml-9">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
            Sources
          </p>
          <div className="space-y-1.5">
            {message.citations!.map((cite, i) => (
              <SourceCard key={i} citation={cite} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* AI Action result — rich component rendering */}
      {!isUser && !message.pending && message.result_type && message.result_type !== "text" && message.action_data && (
        <div className="w-full max-w-[88%] ml-9 mt-1">
          <ActionResultRenderer
            resultType={message.result_type}
            actionData={message.action_data}
            redirect={message.redirect}
            onAskAI={onAskAI}
          />
        </div>
      )}

      {/* Not found notice */}
      {!isUser && !message.pending && message.sources_found === false && !hasCitations && (
        <div className="ml-9 text-[11px] text-amber-600 bg-amber-50 border
                        border-amber-200 rounded-lg px-3 py-1.5 max-w-[80%]">
          💡 No matching passages found. Try uploading the relevant document first.
        </div>
      )}
    </motion.div>
  );
}
