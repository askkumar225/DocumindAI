/**
 * ChatMessage.tsx — A single user or assistant message bubble.
 *
 * Features:
 *  • Full markdown rendering (headings, lists, bold, italic, inline-code, code blocks)
 *  • Copy entire message text
 *  • Thumbs up / thumbs down feedback (local only — extend to API as needed)
 *  • Regenerate button (last AI message only)
 *  • Streaming cursor while content is live
 */

import { useState } from "react";
import { motion } from "framer-motion";
import type { AIMessage, Feedback } from "../../types/ai";
import CodeBlock from "./CodeBlock";

// ─── Inline markdown renderer ─────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  // Split on **bold**, *italic*, `inline-code`, [link](url)
  const parts = text.split(
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  );
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} className="italic text-slate-200">{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={i} className="bg-slate-800 text-indigo-300
                                  px-1.5 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    // Markdown link [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch)
      return (
        <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
           className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300">
          {linkMatch[1]}
        </a>
      );
    return part;
  });
}

// ─── Block markdown renderer ──────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines    = text.split("\n");
  const output: React.ReactNode[] = [];
  let inCode     = false;
  let codeLang   = "";
  let codeLines: string[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  function flushCode() {
    if (codeLines.length === 0) return;
    output.push(
      <CodeBlock key={key++} language={codeLang} code={codeLines.join("\n")} />
    );
    codeLines = [];
    codeLang  = "";
  }

  function flushList() {
    if (!listBuffer) return;
    const Tag = listBuffer.ordered ? "ol" : "ul";
    const cls = listBuffer.ordered
      ? "list-decimal ml-5 space-y-1 my-2"
      : "list-disc   ml-5 space-y-1 my-2";
    output.push(
      <Tag key={key++} className={cls}>
        {listBuffer.items.map((item, idx) => (
          <li key={idx} className="text-slate-300 text-sm leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </Tag>
    );
    listBuffer = null;
  }

  for (const line of lines) {
    // ── Code fence ────────────────────────────────────────────────────────────
    if (line.startsWith("```")) {
      flushList();
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode   = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    // ── Headings ─────────────────────────────────────────────────────────────
    if (line.startsWith("#### ")) {
      flushList();
      output.push(<h4 key={key++} className="text-sm font-bold text-white mt-3 mb-1">{renderInline(line.slice(5))}</h4>);
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      output.push(<h3 key={key++} className="text-base font-bold text-white mt-4 mb-1">{renderInline(line.slice(4))}</h3>);
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      output.push(<h2 key={key++} className="text-lg font-bold text-white mt-5 mb-1.5">{renderInline(line.slice(3))}</h2>);
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      output.push(<h1 key={key++} className="text-xl font-bold text-white mt-5 mb-2">{renderInline(line.slice(2))}</h1>);
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────────────────────
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      flushList();
      output.push(<hr key={key++} className="border-slate-700 my-4" />);
      continue;
    }

    // ── Blockquote ────────────────────────────────────────────────────────────
    if (line.startsWith("> ")) {
      flushList();
      output.push(
        <blockquote key={key++}
          className="border-l-2 border-indigo-500/50 pl-4 my-2
                     text-slate-400 text-sm italic">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // ── Unordered list ────────────────────────────────────────────────────────
    const unorderedMatch = line.match(/^[-*+]\s(.+)/);
    if (unorderedMatch) {
      if (listBuffer && listBuffer.ordered) flushList();
      if (!listBuffer) listBuffer = { ordered: false, items: [] };
      listBuffer.items.push(unorderedMatch[1]);
      continue;
    }

    // ── Ordered list ──────────────────────────────────────────────────────────
    const orderedMatch = line.match(/^\d+\.\s(.+)/);
    if (orderedMatch) {
      if (listBuffer && !listBuffer.ordered) flushList();
      if (!listBuffer) listBuffer = { ordered: true, items: [] };
      listBuffer.items.push(orderedMatch[1]);
      continue;
    }

    // ── Blank line ────────────────────────────────────────────────────────────
    if (line.trim() === "") {
      flushList();
      output.push(<div key={key++} className="h-2" />);
      continue;
    }

    // ── Normal paragraph ──────────────────────────────────────────────────────
    flushList();
    output.push(
      <p key={key++} className="text-slate-300 text-sm leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  // Flush any open buffers
  flushList();
  if (inCode) flushCode();

  return <>{output}</>;
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  onClick, title, active = false, children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs
                  transition-all duration-150
                  ${active
                    ? "bg-indigo-600/30 text-indigo-300"
                    : "text-slate-600 hover:bg-slate-700/60 hover:text-slate-300"}`}
    >
      {children}
    </button>
  );
}

// ─── ChatMessage ──────────────────────────────────────────────────────────────

interface ChatMessageProps {
  msg: AIMessage;
  isLastAI?: boolean;
  onRegenerate?: () => void;
}

export default function ChatMessage({
  msg, isLastAI = false, onRegenerate,
}: ChatMessageProps) {
  const isUser = msg.role === "user";
  const [copied,   setCopied]   = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex items-start gap-4 group
                  ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center
                    justify-center text-sm font-black select-none
                    ${isUser
                      ? "bg-indigo-600 text-white"
                      : "bg-gradient-to-br from-violet-600 to-indigo-700 text-white"}`}
      >
        {isUser ? "U" : "✦"}
      </div>

      {/* Bubble + actions */}
      <div
        className={`flex flex-col gap-1.5 max-w-[82%]
                    ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Role label */}
        <span
          className={`text-[10px] font-bold uppercase tracking-widest
                      ${isUser ? "text-indigo-400" : "text-violet-400"}`}
        >
          {isUser ? "You" : "DocuMind AI"}
        </span>

        {/* Content bubble */}
        <div
          className={`rounded-2xl px-5 py-3.5 text-sm
                      ${isUser
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-slate-800/80 border border-slate-700/50 rounded-tl-sm"}`}
        >
          {isUser ? (
            <p className="leading-relaxed whitespace-pre-wrap break-words">
              {msg.content}
            </p>
          ) : (
            <div>
              {renderMarkdown(msg.content)}
              {/* Streaming cursor */}
              {msg.streaming && (
                <span
                  className="inline-block w-2 h-4 bg-violet-400 ml-0.5
                             rounded-sm animate-pulse align-middle"
                />
              )}
            </div>
          )}
        </div>

        {/* Action row — visible on hover for AI messages, always for user */}
        {!msg.streaming && (
          <div
            className={`flex items-center gap-1
                        transition-opacity duration-200
                        ${isUser
                          ? "opacity-0 group-hover:opacity-100"
                          : "opacity-0 group-hover:opacity-100"}`}
          >
            {/* Copy */}
            <ActionBtn onClick={handleCopy} title="Copy message">
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#34d399" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="4" y="1" width="7" height="8" rx="1"
                        stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="1" y="3" width="7" height="8" rx="1"
                        stroke="currentColor" strokeWidth="1.2" fill="transparent"/>
                </svg>
              )}
            </ActionBtn>

            {/* AI-only actions */}
            {!isUser && (
              <>
                {/* Thumbs up */}
                <ActionBtn
                  onClick={() => setFeedback(feedback === "up" ? null : "up")}
                  title="Good response"
                  active={feedback === "up"}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 11V5.5l2.5-4.5h.5c.28 0 .5.22.5.5v2.5h4a1 1 0 011 1v.5l-1.5 4H5L2 11z"
                          stroke="currentColor" strokeWidth="1.2"
                          strokeLinejoin="round"
                          fill={feedback === "up" ? "currentColor" : "none"}/>
                    <path d="M2 5.5H1V11h1" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                </ActionBtn>

                {/* Thumbs down */}
                <ActionBtn
                  onClick={() => setFeedback(feedback === "down" ? null : "down")}
                  title="Poor response"
                  active={feedback === "down"}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 1v5.5l2.5 4.5h.5c.28 0 .5-.22.5-.5V8h4a1 1 0 001-1v-.5L9 2.5H5L2 1z"
                          stroke="currentColor" strokeWidth="1.2"
                          strokeLinejoin="round"
                          fill={feedback === "down" ? "currentColor" : "none"}/>
                    <path d="M2 6.5H1V1h1" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                </ActionBtn>

                {/* Regenerate — only on last AI message */}
                {isLastAI && onRegenerate && (
                  <ActionBtn onClick={onRegenerate} title="Regenerate response">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 6a5 5 0 005 5 5 5 0 004.33-2.5"
                            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      <path d="M11 6a5 5 0 00-5-5 5 5 0 00-4.33 2.5"
                            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      <path d="M9 3.5l2-1-1 2" stroke="currentColor"
                            strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </ActionBtn>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
