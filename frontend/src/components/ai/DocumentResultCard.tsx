/**
 * DocumentResultCard — shows a single document from an AI search result.
 * Used in chat when the AI returns result_type="documents".
 */

import { useNavigate } from "react-router-dom";

const RISK_DOT: Record<string, string> = {
  CRITICAL: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "🔵",
};

const TYPE_ICON: Record<string, string> = {
  CONTRACT: "📝", INVOICE: "🧾", PURCHASE_ORDER: "📦",
  REPORT: "📊", POLICY: "📋", RECEIPT: "🧾", OTHER: "📄",
};

interface DocumentResult {
  id: number;
  title: string;
  document_type: string;
  status: string;
  overall_risk?: string | null;
  amount?: number | null;
  created_at?: string;
}

interface Props {
  doc: DocumentResult;
  onAskAI?: (docId: number, title: string) => void;
}

export default function DocumentResultCard({ doc, onAskAI }: Props) {
  const navigate = useNavigate();
  const icon = TYPE_ICON[doc.document_type] ?? "📄";
  const riskDot = doc.overall_risk ? RISK_DOT[doc.overall_risk] : null;

  return (
    <div className="flex items-start gap-3 p-3.5 bg-white border border-gray-200
                    rounded-xl hover:shadow-sm hover:border-indigo-200
                    transition-all duration-150">
      {/* Icon */}
      <div className="text-2xl flex-shrink-0 mt-0.5">{icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{doc.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-gray-400">{doc.document_type.replace("_", " ")}</span>
          {doc.status && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
              ${doc.status === "APPROVED"        ? "bg-emerald-50 text-emerald-700"
              : doc.status === "PENDING_APPROVAL" ? "bg-yellow-50 text-yellow-700"
              : doc.status === "REJECTED"         ? "bg-red-50 text-red-700"
              : "bg-gray-100 text-gray-500"}`}>
              {doc.status.replace(/_/g, " ")}
            </span>
          )}
          {riskDot && (
            <span className="text-xs text-gray-500">{riskDot} {doc.overall_risk} risk</span>
          )}
          {doc.amount != null && (
            <span className="text-xs font-medium text-indigo-600">
              {Number(doc.amount).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button
          onClick={() => navigate(`/documents/${doc.id}`)}
          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg
                     hover:bg-indigo-700 transition-colors font-medium"
        >
          Open
        </button>
        {onAskAI && (
          <button
            onClick={() => onAskAI(doc.id, doc.title)}
            className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5
                       rounded-lg hover:bg-indigo-50 transition-colors font-medium"
          >
            Ask AI
          </button>
        )}
      </div>
    </div>
  );
}
