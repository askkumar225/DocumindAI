/**
 * Axios instance pre-configured for the DocuMind Django backend.
 *
 * Base URL resolves from:
 *   1. VITE_API_URL env variable (set at build time for Docker/production)
 *   2. /api  (relative — works behind Nginx reverse-proxy in Docker)
 *   3. http://localhost:8000/api  (fallback for local dev without Docker)
 *
 * Interceptors:
 *   Request  → attach JWT access token from authStore (never localStorage)
 *   Response → on 401, clear auth state so the app redirects to login
 */
import axios from "axios";
import { authStore } from "../store/authStore";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:8000/api");

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// ─── Request: attach Bearer token ────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = authStore.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response: handle 401 ────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authStore.logout();
    }
    return Promise.reject(error);
  }
);

export default api;
