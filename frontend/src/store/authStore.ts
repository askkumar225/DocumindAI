/**
 * Auth store — in-memory JWT state.
 *
 * Tokens live in module-level variables (never localStorage/sessionStorage).
 * React components subscribe via a simple listener pattern so they re-render
 * on login/logout without needing Redux or Zustand.
 *
 * Why in-memory?
 *   localStorage is accessible to any JS running on the page (XSS risk).
 *   Keeping tokens in memory limits the attack surface for token theft.
 */

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  department: string;
  is_staff: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

// ─── In-memory state ──────────────────────────────────────────────────────────

let _state: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
};

// ─── Listeners (for React re-renders) ─────────────────────────────────────────

type Listener = () => void;
const _listeners = new Set<Listener>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const authStore = {
  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },

  getState(): Readonly<AuthState> {
    return _state;
  },

  getAccessToken(): string | null {
    return _state.accessToken;
  },

  getUser(): AuthUser | null {
    return _state.user;
  },

  isAuthenticated(): boolean {
    return _state.accessToken !== null;
  },

  /**
   * Called after a successful login or register.
   * Stores tokens and user profile in memory.
   */
  login(accessToken: string, refreshToken: string, user: AuthUser): void {
    _state = { accessToken, refreshToken, user };
    _notify();
  },

  /**
   * Update access token after a refresh call.
   */
  setAccessToken(token: string): void {
    _state = { ..._state, accessToken: token };
    _notify();
  },

  /**
   * Clear all auth state (logout).
   */
  logout(): void {
    _state = { accessToken: null, refreshToken: null, user: null };
    _notify();
  },
};

// ─── React hook ───────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

/** React hook that re-renders the component whenever auth state changes. */
export function useAuth() {
  const [state, setState] = useState<Readonly<AuthState>>(authStore.getState);

  useEffect(() => {
    return authStore.subscribe(() => setState(authStore.getState()));
  }, []);

  return {
    ...state,
    isAuthenticated: state.accessToken !== null,
    login: authStore.login.bind(authStore),
    logout: authStore.logout.bind(authStore),
  };
}
