/**
 * EmptyState — shown when an AI action returns no results.
 */

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = "🔍", title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center
                    bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-3xl mb-2">{icon}</span>
      <p className="font-semibold text-gray-700 text-sm">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5
                     rounded-lg hover:bg-indigo-50 transition-colors font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
