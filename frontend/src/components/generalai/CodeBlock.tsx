/**
 * CodeBlock.tsx — Fenced code block with language label + copy button.
 *
 * Used by ChatMessage to render ```language ... ``` blocks from AI replies.
 */

import { useState } from "react";

interface CodeBlockProps {
  language: string;
  code: string;
}

export default function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — silent */
    }
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/50">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2
                      bg-slate-800 border-b border-slate-700/50">
        <span className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-wider">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-semibold
                     transition-colors duration-200
                     text-slate-500 hover:text-slate-200"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#34d399" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="4" y="1" width="7" height="8" rx="1"
                      stroke="currentColor" strokeWidth="1.2"/>
                <rect x="1" y="3" width="7" height="8" rx="1"
                      stroke="currentColor" strokeWidth="1.2" fill="#0d1117"/>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <pre className="bg-[#0d1117] text-[#e6edf3] text-sm p-4
                      overflow-x-auto font-mono leading-relaxed
                      scrollbar-thin scrollbar-thumb-slate-700">
        <code>{code}</code>
      </pre>
    </div>
  );
}
