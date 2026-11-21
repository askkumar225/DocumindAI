/**
 * ChatInput
 *
 * Message input bar with animated send button.
 * Fires onSend on Enter or button click.
 */

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
}: ChatInputProps) {
  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="flex items-center gap-2 p-3 border-t border-white/8">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder="Ask DocuMind AI…"
        className="flex-1 bg-white/5 border border-white/10 rounded-xl
                   px-3.5 py-2 text-sm text-white placeholder:text-slate-500
                   focus:outline-none focus:border-indigo-500/60
                   focus:shadow-[0_0_0_2px_rgba(99,102,241,0.15)]
                   transition-all duration-200 disabled:opacity-50"
        aria-label="Chat message input"
      />

      <button
        onClick={onSend}
        disabled={!canSend}
        aria-label="Send message"
        className={`
          flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
          transition-all duration-200
          ${canSend
            ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:scale-105 hover:shadow-[0_0_12px_3px_rgba(99,102,241,0.4)] active:scale-95"
            : "bg-white/5 text-slate-600 cursor-not-allowed"
          }
        `}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  );
}
