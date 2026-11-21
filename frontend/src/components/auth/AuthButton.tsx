/**
 * AuthButton
 *
 * Animated submit button with:
 *   - Loading spinner state
 *   - Success state (green check)
 *   - Arrow shift on hover
 *   - Glow on hover
 */

interface AuthButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  success?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}

export default function AuthButton({
  children,
  loading = false,
  success = false,
  disabled = false,
  type = "submit",
  onClick,
}: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        group relative w-full py-3 px-6 rounded-xl font-semibold text-sm
        transition-all duration-300 overflow-hidden outline-none
        focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2
        focus-visible:ring-offset-transparent
        disabled:cursor-not-allowed
        ${success
          ? "bg-emerald-600 text-white shadow-[0_0_20px_4px_rgba(16,185,129,0.35)]"
          : disabled || loading
            ? "bg-indigo-600/50 text-white/60"
            : `bg-gradient-to-r from-indigo-600 to-violet-600 text-white
               hover:from-indigo-500 hover:to-violet-500
               hover:shadow-[0_0_24px_6px_rgba(99,102,241,0.4)]
               hover:scale-[1.02] active:scale-[0.98]`
        }
      `}
    >
      {/* Shimmer overlay on hover */}
      {!loading && !success && !disabled && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100
                        transition-opacity duration-300
                        bg-gradient-to-r from-transparent via-white/10 to-transparent
                        translate-x-[-100%] group-hover:translate-x-[100%]
                        transition-transform duration-700" />
      )}

      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <>
            {/* Spinner */}
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor"
                      strokeWidth="3" strokeOpacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"
                    strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <span>{children}</span>
          </>
        ) : success ? (
          <>
            {/* Checkmark */}
            <svg className="h-4 w-4 animate-check" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Success!</span>
          </>
        ) : (
          <>
            <span>{children}</span>
            {/* Arrow that shifts right on hover */}
            <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                 viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </>
        )}
      </span>
    </button>
  );
}
