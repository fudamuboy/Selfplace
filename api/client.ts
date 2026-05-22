import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import { Config } from '../constants/Config';

const client = axios.create({
  baseURL: Config.API_URL,
});

// Prevent toast spam: track if a session-expiry redirect is already in flight
let sessionExpiryHandled = false;

client.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;

    // ── Session expiry: 401 Unauthorized or 403 Forbidden ───────────────────
    if (status === 401 || status === 403) {
      if (!sessionExpiryHandled) {
        sessionExpiryHandled = true;

        // Clear token/session and trigger session-expiry flow
        useAuthStore.getState().handleSessionExpiry();

        // Reset dedup flag after navigation completes so future logins work
        setTimeout(() => {
          sessionExpiryHandled = false;
        }, 3000);
      }

      // Return a rejected promise with a clean, user-friendly error
      const sessionError = new Error('SESSION_EXPIRED');
      (sessionError as any).isSessionExpiry = true;
      return Promise.reject(sessionError);
    }

    // ── User not found (multi-env safety) ───────────────────────────────────
    if (
      status === 404 &&
      error.response?.data?.message === 'Kullanıcı bulunamadı.'
    ) {
      if (!sessionExpiryHandled) {
        sessionExpiryHandled = true;
        useAuthStore.getState().handleSessionExpiry();
        setTimeout(() => {
          sessionExpiryHandled = false;
        }, 3000);
      }
      const notFoundError = new Error('SESSION_EXPIRED');
      (notFoundError as any).isSessionExpiry = true;
      return Promise.reject(notFoundError);
    }

    // ── Network / no-response errors ────────────────────────────────────────
    if (!error.response) {
      error.message = 'Bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol edin.';
    }

    // ── Dev-only diagnostics (NEVER shown to users) ─────────────────────────
    if (__DEV__) {
      console.warn('[API] Request failed:', {
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
      });
    }

    return Promise.reject(error);
  }
);

export default client;
