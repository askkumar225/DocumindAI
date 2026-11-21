import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<{
        access: string;
        refresh: string;
        user: AuthUser;
      }>("/auth/login/", { username, password });

      authStore.login(res.data.access, res.data.refresh, res.data.user);

      // Show brief success state before navigating
      setSuccess(true);
      setTimeout(() => navigate("/hub"), 900);
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { error?: string } };
        request?: unknown;
        message?: string;
      };

      let msg = "Login failed. Check your credentials.";
      if (errObj.response?.data?.error) {
        msg = errObj.response.data.error;
      } else if (errObj.request) {
        msg = "Cannot connect to DocuMind AI server. Make sure the backend is running on port 8000.";
      }
      setError(msg);
      setLoading(false);
    }
  }

  // Staggered field animation
  const fieldVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: 0.45 + i * 0.1, duration: 0.45, ease: "easeOut" as const },
    }),
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <AnimatedBackground />
      <Chatbot />

      {/* ── Desktop: two-column layout ── Mobile: centered card ────────── */}
      <div className="w-full max-w-5xl flex items-center justify-center gap-20">

        {/* Left: AI Orb — hidden on mobile */}
        <div className="hidden lg:flex flex-col items-center justify-center flex-1">
          <AIOrb />
        </div>

        {/* Right: login card */}
        <div className="flex-1 flex justify-center">
          <AuthCard>
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
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mb-7"
            >
              <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
              <p className="text-slate-400 text-sm mt-1">
                Sign in to access your documents and AI workspace.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible">
                <AuthInput
                  label="Username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </motion.div>

              {/* Password */}
              <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
                <PasswordInput
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </motion.div>

              {/* Remember me + Forgot */}
              <motion.div
                custom={2} variants={fieldVariants} initial="hidden" animate="visible"
                className="flex items-center justify-between"
              >
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer
                                  select-none group">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-white/20 bg-white/5
                               accent-indigo-500 cursor-pointer"
                  />
                  <span className="group-hover:text-slate-300 transition-colors">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </motion.div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3
                             flex items-center gap-2.5 text-sm text-red-400"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
                  </svg>
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible">
                <AuthButton loading={loading} success={success}>
                  {loading ? "Signing in…" : "Sign In"}
                </AuthButton>
              </motion.div>
            </form>

            {/* Footer */}
            <motion.p
              custom={4} variants={fieldVariants} initial="hidden" animate="visible"
              className="text-center text-sm text-slate-500 mt-6"
            >
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
              >
                Create Account →
              </Link>
            </motion.p>
          </AuthCard>
        </div>
      </div>
    </div>
  );
}
