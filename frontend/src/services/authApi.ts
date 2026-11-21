/**
 * authApi — authentication service layer.
 *
 * All auth HTTP calls go through this module so components never
 * call axios/api directly for auth operations.
 */

import api from "./api";
import type { AuthUser } from "../store/authStore";

export interface RegisterPayload {
  username: string;
  email:    string;
  password: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthTokens {
  access:  string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export interface RegisterResponse extends AuthTokens {
  message:  string;
  username: string;
  email:    string;
}

const authApi = {
  /**
   * Register a new user.
   * Returns access + refresh tokens (but NOT a user object — fetch /me/ after).
   */
  register: (data: RegisterPayload) =>
    api.post<RegisterResponse>("/auth/register/", data),

  /**
   * Log in with username + password.
   * Returns access + refresh tokens and full user profile.
   */
  login: (data: LoginPayload) =>
    api.post<LoginResponse>("/auth/login/", data),

  /**
   * Fetch the current authenticated user's profile.
   * Call this after register to get the full AuthUser object.
   */
  me: (accessToken?: string) =>
    api.get<AuthUser>("/auth/me/", accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined
    ),

  /**
   * Refresh the access token using a refresh token.
   */
  refresh: (refreshToken: string) =>
    api.post<{ access: string }>("/auth/token/refresh/", { refresh: refreshToken }),

  /**
   * Logout — blacklist the refresh token on the server.
   * Best-effort: we don't throw on failure so the client always clears
   * local state regardless of network/server issues.
   */
  logout: async (refreshToken: string): Promise<void> => {
    try {
      await api.post("/auth/logout/", { refresh: refreshToken });
    } catch {
      // Swallow — the frontend clears its own state regardless.
    }
  },
};

export default authApi;
