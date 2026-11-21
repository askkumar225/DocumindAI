/**
 * PasswordInput
 *
 * Password field with show/hide toggle and optional strength indicator.
 */

import { useState } from "react";
import AuthInput from "./AuthInput";

interface PasswordInputProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  name?: string;
  showStrength?: boolean;
  placeholder?: string;
  autoComplete?: string;
}

function getStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak",   color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Fair",   color: "bg-orange-400" };
  if (score <= 3) return { score: 3, label: "Medium", color: "bg-yellow-400" };
  if (score <= 4) return { score: 4, label: "Strong", color: "bg-emerald-400" };
  return { score: 5, label: "Very Strong", color: "bg-emerald-500" };
}

export default function PasswordInput({
  label = "Password",
  value,
  onChange,
  error,
  name = "password",
  showStrength = false,
  autoComplete,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const strength = getStrength(value);

  const EyeIcon = () => (
    <button
      type="button"
      onClick={() => setShow((s) => !s)}
      className="focus:outline-none transition-opacity hover:opacity-80"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? (
        /* Eye-off */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        /* Eye */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );

  return (
    <div>
      <AuthInput
        label={label}
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        error={error}
        icon={<EyeIcon />}
        autoComplete={autoComplete}
      />

      {/* Strength indicator */}
      {showStrength && value.length > 0 && (
        <div className="mt-2">
          <div className="flex gap-1 h-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-300
                  ${i <= strength.score ? strength.color : "bg-white/10"}`}
              />
            ))}
          </div>
          <p className={`text-xs mt-1 transition-colors duration-200 ${
            strength.score <= 1 ? "text-red-400"
            : strength.score <= 2 ? "text-orange-400"
            : strength.score <= 3 ? "text-yellow-400"
            : "text-emerald-400"
          }`}>
            {strength.label}
          </p>
        </div>
      )}
    </div>
  );
}
