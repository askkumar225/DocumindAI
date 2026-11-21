/**
 * ActionButtons — quick-action command buttons shown at the top of chat.
 * Clicking sends a preset command to the chat input.
 */

interface Action {
  label: string;
  icon:  string;
  command: string;
}

const ACTIONS: Action[] = [
  { label: "Summarize",      icon: "📄", command: "Summarize this document" },
  { label: "Find Risks",     icon: "⚠️",  command: "Show high-risk documents" },
  { label: "Extract Data",   icon: "📊", command: "Extract all important dates and amounts" },
  { label: "Find Expiring",  icon: "📅", command: "Find contracts expiring soon" },
  { label: "Pending Review", icon: "✅", command: "What documents need my approval?" },
  { label: "Compare",        icon: "🔀", command: "Compare these documents" },
];

interface Props {
  onSelect: (command: string) => void;
  disabled?: boolean;
}

export default function ActionButtons({ onSelect, disabled = false }: Props) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => onSelect(action.command)}
          disabled={disabled}
          className="flex items-center gap-1.5 text-xs font-medium
                     bg-white border border-gray-200 text-gray-600
                     hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50
                     px-3 py-1.5 rounded-full transition-all duration-150
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
