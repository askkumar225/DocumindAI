/**
 * SuggestedQuestions — quick-fire chips shown before the user has asked anything.
 */

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (q: string) => void;
  documentCount: number;
}

const DEFAULT_QUESTIONS = [
  { icon: "📄", text: "Summarize this document" },
  { icon: "🔍", text: "Find important information" },
  { icon: "📊", text: "Extract key data" },
  { icon: "⚠️",  text: "Find potential risks" },
  { icon: "📅", text: "What are the important dates?" },
  { icon: "💰", text: "What are the payment terms?" },
];

export default function SuggestedQuestions({
  questions,
  onSelect,
  documentCount,
}: SuggestedQuestionsProps) {
  const items =
    questions.length > 0
      ? questions.map((q) => ({ icon: "💬", text: q }))
      : DEFAULT_QUESTIONS;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {documentCount > 0 && (
        <p className="text-xs text-gray-400 text-center mb-4 font-medium uppercase tracking-wider">
          Suggested questions
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onSelect(item.text)}
            className="flex items-center gap-2.5 text-left px-4 py-3
                       bg-white border border-gray-200 rounded-xl
                       text-sm text-gray-600 font-medium
                       hover:border-indigo-300 hover:bg-indigo-50
                       hover:text-indigo-700
                       transition-all duration-150 shadow-sm hover:shadow"
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1">{item.text}</span>
            <svg className="w-3 h-3 text-gray-300 flex-shrink-0"
                 viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
