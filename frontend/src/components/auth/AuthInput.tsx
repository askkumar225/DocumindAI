/**
 * AuthInput
 *
 * Animated input with:
 *   - Glowing indigo border on focus
 *   - Smooth label transition
 *   - Error state styling
 *   - Accessible label/input pairing
 */

import { useState } from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function AuthInput({
  label,
  error,
  icon,
  className: _cls,
  ...props
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);

  const hasValue = String(props.value ?? "").length > 0;
  const active = focused || hasValue;

  return (
    <div className="relative">
      {/* Label */}
      <label
        className={`absolute left-4 transition-all duration-200 pointer-events-none select-none
          ${active
            ? "top-2 text-[10px] font-semibold tracking-wide"
            : "top-4 text-sm font-normal"
          }
          ${error
            ? "text-red-400"
            : focused
              ? "text-indigo-400"
              : "text-slate-400"
          }`}
      >
        {label}
      </label>

      {/* Icon */}
      {icon && (
        <div className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200
          ${focused ? "text-indigo-400" : "text-slate-500"}`}>
          {icon}
        </div>
      )}

      {/* Input */}
      <input
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        className={`
          w-full pt-6 pb-2 px-4 rounded-xl text-sm text-white
          bg-white/5 border transition-all duration-200 outline-none
          ${icon ? "pr-10" : ""}
          ${error
            ? "border-red-500/60 bg-red-500/5 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
            : focused
              ? "border-indigo-500/70 shadow-[0_0_0_3px_rgba(99,102,241,0.2)] bg-white/8"
              : "border-white/10 hover:border-white/20"
          }
          placeholder:text-transparent
        `}
        placeholder={label}
      />

      {/* Animated focus underline */}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full
                       bg-gradient-to-r from-indigo-500 to-violet-500
                       transition-all duration-300
                       ${focused ? "w-full opacity-100" : "w-0 opacity-0"}`} />

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
            <path d="M6 4v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="6" cy="8.5" r="0.5" fill="currentColor"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
