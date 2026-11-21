import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { authStore } from "../store/authStore";
import type { AuthUser } from "../store/authStore";

import AnimatedBackground from "../components/auth/AnimatedBackground";
import AIOrb from "../components/auth/AIOrb";
import AuthCard from "../components/auth/AuthCard";
import AuthInput from "../components/auth/AuthInput";
import PasswordInput from "../components/auth/PasswordInput";
import AuthButton from "../components/auth/AuthButton";
import Chatbot from "../components/chatbot/Chatbot";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [registered, setRegistered] = useState(false);

  // ── Field change ──────────────────────────────────────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  // ── Frontend validation ───────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.username.trim())       errs.username = "Username is required.";
    if (!form.email.trim())          errs.email    = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                     errs.email    = "Enter a valid email address.";
    if (!form.password)              errs.password = "Password is required.";
    else if (form.password.length < 8)
                                     errs.password = "Password must be at least 8 characters.";
    if (!form.confirmPassword)       errs.confirmPassword = "Please confirm your password.";
    else if (form.password !== form.confirmPassword)
                                     errs.confirmPassword = "Passwords do not match.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setErrors({});
    setLoading(true);

    try {
      // Step 1 — Register (backend returns access + refresh but no user object)
      const res = await api.post<{
        access: string;
        refresh: string;
        message: string;
        username: string;
        email: string;
      }>("/auth/register/", {
        username: form.username,
        email: form.email,
        password: form.password,
      });

      // Step 2 — Fetch full user profile using the just-issued token
      // Use a one-off axios call so the stored token (still null) isn't used
      const { default: axios } = await import("axios");
      const profileRes = await axios.get<AuthUser>(
        "http://localhost:8000/api/auth/me/",
        { headers: { Authorization: `Bearer ${res.data.access}` } }
      );

      authStore.login(res.data.access, res.data.refresh, profileRes.data);

      setSuccess(true);
      setRegistered(true);
      setTimeout(() => navigate("/dashboard"), 1800);
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: Record<string, unknown>; status?: number };
        request?: unknown;
        message?: string;
      };

      const fieldErrors: Record<string, string> = {};

      if (errObj.response?.data) {
        // DRF field-level errors: { username: ["already exists"], ... }
        for (const [key, val] of Object.entries(errObj.response.data)) {
          fieldErrors[key] = Array.isArray(val) ? (val[0] as string) : String(val);
        }
      } else if (errObj.request) {
        // Request sent but no response — backend not reachable
        fieldErrors.non_field_errors =
          "Cannot connect to DocuMind AI server. Make sure the backend is running on port 8000.";
      } else {
        fieldErrors.non_field_errors = errObj.message ?? "Unexpected error. Please try again.";
      }

      setErrors(fieldErrors);
    } finally {
      setLoading(false);
    }
  }

  // Password match indicator
  const passwordsMatch =
    form.password.length > 0 &&
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword;

  const fieldVariants = {
    hidden:  { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: 0.4 + i * 0.09, duration: 0.45, ease: "easeOut" as const },
    }),
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <AnimatedBackground />
      <Chatbot />

      <div className="w-full max-w-5xl flex items-center justify-center gap-20">

        {/* Left: AI Orb — hidden on mobile */}
        <div className="hidden lg:flex flex-col items-center justify-center flex-1">
          <AIOrb />
        </div>

        {/* Right: registration card */}
        <div className="flex-1 flex justify-center">
          <AuthCard>

            {/* ── Success overlay ───────────────────────────────────────── */}
            <AnimatePresence>
              {registered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 rounded-2xl flex flex-col items-center
                             justify-center bg-slate-900/95 backdrop-blur-sm z-10"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40
                               flex items-center justify-center mb-4"
                  >
                    <svg className="w-8 h-8 text-emerald-400 animate-check"
                         viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor"
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-2">Account Created!</h3>
                  <p className="text-slate-400 text-sm text-center px-4">
                    Your DocuMind AI workspace is ready.
                    <br />Redirecting to dashboard…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile-only logo */}
            <div className="lg:hidden text-center mb-6">
              <h1 className="text-2xl font-bold text-white animate-logo-glow">DocuMind AI</h1>
              <p className="text-indigo-300/70 text-xs mt-1 tracking-wide">
                Intelligent Documents. Smarter Decisions.
              </p>
            </div>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-7"
            >
              <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
              <p className="text-slate-400 text-sm mt-1">
                Start managing your documents intelligently.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible">
                <AuthInput
                  label="Username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  error={errors.username}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </motion.div>

              {/* Email */}
              <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
                <AuthInput
                  label="Email Address"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                  autoComplete="email"
                />
              </motion.div>

              {/* Password */}
              <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible">
                <PasswordInput
                  label="Password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                  showStrength
                  autoComplete="new-password"
                />
              </motion.div>

              {/* Confirm Password */}
              <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible">
                <PasswordInput
                  label="Confirm Password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                />
                {/* Match indicator */}
                {form.confirmPassword.length > 0 && (
                  <p className={`text-xs mt-1.5 flex items-center gap-1.5 transition-colors
                    ${passwordsMatch ? "text-emerald-400" : "text-red-400"}`}>
                    {passwordsMatch ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor"
                                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Passwords match
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor"
                                strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Passwords do not match
                      </>
                    )}
                  </p>
                )}
              </motion.div>

              {/* Generic errors */}
              {(errors.non_field_errors || errors.detail) && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3
                             text-sm text-red-400"
                >
                  {errors.non_field_errors || errors.detail}
                </motion.div>
              )}

              {/* Submit */}
              <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="visible">
                <AuthButton loading={loading} success={success}>
                  {loading ? "Creating account…" : "Create Account"}
                </AuthButton>
              </motion.div>
            </form>

            {/* Footer */}
            <motion.p
              custom={5} variants={fieldVariants} initial="hidden" animate="visible"
              className="text-center text-sm text-slate-500 mt-6"
            >
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
              >
                Sign In →
              </Link>
            </motion.p>
          </AuthCard>
        </div>
      </div>
    </div>
  );
}
