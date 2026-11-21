/**
 * SummaryResult — renders AI document summary in chat.
 * Used when result_type="summary".
 */

import { useNavigate } from "react-router-dom";

const RISK_CFG: Record<string, string> = {
  CRITICAL: "bg-red-50 text-red-700 border-red-200",
  HIGH:     "bg-orange-50 text-orange-700 border-orange-200",
  MEDIUM:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  LOW:      "bg-emerald-50 text-emerald-700 border-emerald-200",
};

interface Props {
  summary: string;
  keyPoints?: string[];
  documentTitle?: string;
  documentId?: number;
  overallRisk?: string | null;
  confidence?: number;
}

export default function SummaryResult({
  summary, keyPoints, documentTitle, documentId, overallRisk, confidence,
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-indigo-800">AI Summary</p>
          {documentTitle && (
            <p className="text-xs text-indigo-500">{documentTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {overallRisk && overallRisk !== "LOW" && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold
              ${RISK_CFG[overallRisk] ?? "bg-gray-100 text-gray-600"}`}>
              {overallRisk} risk
            </span>
          )}
          {confidence != null && confidence > 0 && (
            <span className="text-xs text-gray-400">
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>
      </div>

      {/* Summary text */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
      </div>

      {/* Key points */}
      {keyPoints && keyPoints.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Key Points</p>
          <ul className="space-y-1">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-indigo-400 flex-shrink-0 mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Open document link */}
      {documentId && (
        <div className="px-4 pb-3">
          <button
            onClick={() => navigate(`/documents/${documentId}`)}
            className="text-xs text-indigo-600 hover:underline"
          >
            View full analysis →
          </button>
        </div>
      )}
    </div>
  );
}
