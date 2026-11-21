/**
 * ApprovalResultCard — shows a pending approval in chat results.
 * Used when result_type="approvals".
 */

import { useNavigate } from "react-router-dom";

const PRIORITY_CFG: Record<string, string> = {
  URGENT: "bg-red-50 text-red-700 border-red-200",
  HIGH:   "bg-orange-50 text-orange-700 border-orange-200",
  NORMAL: "bg-blue-50 text-blue-700 border-blue-200",
  LOW:    "bg-gray-100 text-gray-500 border-gray-200",
};

interface ApprovalItem {
  id: number;
  document_id: number;
  document_title: string;
  document_type: string;
  status: string;
  priority: string;
  due_date?: string | null;
  submitted_by?: string;
  reviewer?: string;
}

interface Props { item: ApprovalItem; }

export default function ApprovalResultCard({ item }: Props) {
  const navigate = useNavigate();
  const priCfg = PRIORITY_CFG[item.priority] ?? PRIORITY_CFG.NORMAL;

  return (
    <div className="flex items-start gap-3 p-3.5 bg-white border border-gray-200
                    rounded-xl hover:shadow-sm hover:border-indigo-200 transition-all">
      <span className="text-2xl mt-0.5">📋</span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{item.document_title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-gray-400">{item.document_type.replace("_", " ")}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${priCfg}`}>
            {item.priority}
          </span>
          {item.due_date && (
            <span className="text-xs text-gray-400">
              Due {new Date(item.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
        {item.submitted_by && (
          <p className="text-xs text-gray-400 mt-0.5">Submitted by: {item.submitted_by}</p>
        )}
      </div>

      <button
        onClick={() => navigate(`/review/${item.id}`)}
        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg
                   hover:bg-indigo-700 transition-colors font-medium shrink-0"
      >
        Review
      </button>
    </div>
  );
}
