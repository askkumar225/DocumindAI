/**
 * RiskResultCard — shows a document with its risk items.
 * Used when result_type="risks".
 */

import { useNavigate } from "react-router-dom";

const SEV: Record<string, { dot: string; bg: string; text: string }> = {
  CRITICAL: { dot: "🔴", bg: "bg-red-50 border-red-200",    text: "text-red-700" },
  HIGH:     { dot: "🟠", bg: "bg-orange-50 border-orange-200", text: "text-orange-700" },
  MEDIUM:   { dot: "🟡", bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700" },
  LOW:      { dot: "🔵", bg: "bg-blue-50 border-blue-100",   text: "text-blue-700" },
};

interface RiskItem {
  title: string;
  description: string;
  severity: string;
  source_text?: string;
  page?: number | null;
}

interface RiskDoc {
  document_id: number;
  document_title: string;
  document_type: string;
  document_status: string;
  risks: RiskItem[];
}

interface Props {
  item: RiskDoc;
}

export default function RiskResultCard({ item }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm
                    transition-all duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <button
            onClick={() => navigate(`/documents/${item.document_id}`)}
            className="font-semibold text-indigo-700 text-sm hover:underline text-left"
          >
            📄 {item.document_title}
          </button>
          <p className="text-xs text-gray-400 mt-0.5">
            {item.document_type.replace("_", " ")} · {item.document_status.replace(/_/g, " ")}
          </p>
        </div>
        <button
          onClick={() => navigate(`/documents/${item.document_id}`)}
          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg
                     hover:bg-indigo-700 transition-colors font-medium shrink-0"
        >
          Review
        </button>
      </div>

      {/* Risk items */}
      <div className="space-y-2">
        {item.risks.slice(0, 3).map((risk, i) => {
          const cfg = SEV[risk.severity] ?? SEV.MEDIUM;
          return (
            <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border ${cfg.bg}`}>
              <span className="text-base flex-shrink-0">{cfg.dot}</span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${cfg.text}`}>{risk.title}</p>
                {risk.description && (
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    {risk.description.slice(0, 120)}{risk.description.length > 120 ? "…" : ""}
                  </p>
                )}
                {risk.page && <p className="text-xs text-gray-400 mt-0.5">Page {risk.page}</p>}
              </div>
            </div>
          );
        })}
        {item.risks.length > 3 && (
          <p className="text-xs text-gray-400 text-center">
            +{item.risks.length - 3} more risk items
          </p>
        )}
      </div>
    </div>
  );
}
