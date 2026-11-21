/**
 * ComparisonResultCard — shows a comparison creation result in chat.
 * Used when result_type="comparison".
 */

import { useNavigate } from "react-router-dom";

interface Props {
  comparisonId?: number;
  title?: string;
  status?: string;
  docCount?: number;
  redirect?: string;
}

export default function ComparisonResultCard({
  comparisonId, title, status, docCount, redirect,
}: Props) {
  const navigate = useNavigate();
  const isRunning = status === "PENDING" || status === "PROCESSING";

  return (
    <div className="bg-white border border-indigo-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔀</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-sm">{title ?? "Document Comparison"}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {docCount} documents · {isRunning ? "Analysis running…" : status}
          </p>
          {isRunning && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
              <p className="text-xs text-indigo-600 animate-pulse">Comparing documents…</p>
            </div>
          )}
        </div>
        {(redirect || comparisonId) && (
          <button
            onClick={() => navigate(redirect ?? `/comparisons/${comparisonId}`)}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg
                       hover:bg-indigo-700 transition-colors font-medium shrink-0"
          >
            View Results
          </button>
        )}
      </div>
    </div>
  );
}
