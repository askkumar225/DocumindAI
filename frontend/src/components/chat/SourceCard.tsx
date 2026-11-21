/**
 * SourceCard — displays a single citation from an AI answer.
 * Clicking navigates to the document detail page.
 */

import { useNavigate } from "react-router-dom";
import type { Citation } from "../../types/chat";

interface SourceCardProps {
  citation: Citation;
  index: number;
}

export default function SourceCard({ citation, index }: SourceCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/documents/${citation.document_id}`)}
      className="group w-full text-left bg-indigo-50 hover:bg-indigo-100
                 border border-indigo-100 hover:border-indigo-300
                 rounded-lg px-3 py-2.5 transition-all duration-150"
    >
      <div className="flex items-start gap-2">
        {/* Citation number */}
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-200
                         text-indigo-700 text-[10px] font-bold
                         flex items-center justify-center mt-0.5">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          {/* Document name + page */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-indigo-700 truncate
                             group-hover:underline">
              📄 {citation.document_title}
            </span>
            {citation.page_number != null && (
              <span className="text-[10px] text-indigo-400 font-medium">
                · page {citation.page_number}
              </span>
            )}
          </div>

          {/* Matched passage preview */}
          {citation.content && (
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              "{citation.content.slice(0, 140)}{citation.content.length > 140 ? "…" : ""}"
            </p>
          )}
        </div>

        {/* Arrow */}
        <svg className="flex-shrink-0 w-3 h-3 text-indigo-300 mt-1
                        group-hover:text-indigo-500 transition-colors"
             viewBox="0 0 12 12" fill="none">
          <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}
