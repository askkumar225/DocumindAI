import { useNavigate } from "react-router-dom";
import type { DocumentListItem } from "../types/document";
import { StatusBadge, AIStatusBadge } from "./StatusBadge";

interface DocumentCardProps {
  doc: DocumentListItem;
}

export function DocumentCard({ doc }: DocumentCardProps) {
  const navigate = useNavigate();

  const isAIReady = doc.ai_status === "COMPLETED";
  const isAIProcessing = doc.ai_status === "PROCESSING" || doc.ai_status === "PENDING";

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100
                 hover:shadow-md transition-shadow p-5"
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">
          {doc.title}
        </h3>
        <StatusBadge status={doc.status} pulse />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Document type chip */}
        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
          {doc.document_type}
        </span>

        {/* AI status */}
        {doc.ai_status && <AIStatusBadge status={doc.ai_status} />}

        {/* Confidence */}
        {isAIReady && doc.confidence_percent !== null && (
          <span className="text-xs text-gray-500 font-medium">
            {doc.confidence_percent}% confidence
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {new Date(doc.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>

        {isAIReady ? (
          <button
            onClick={() => navigate(`/documents/${doc.id}`)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800
                       hover:underline transition-colors"
          >
            View Analysis →
          </button>
        ) : isAIProcessing ? (
          <span className="text-xs text-purple-500 animate-pulse">
            AI analysing…
          </span>
        ) : null}
      </div>
    </div>
  );
}
