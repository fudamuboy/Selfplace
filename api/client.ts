import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import { Config } from '../constants/Config';

const client = axios.create({
  baseURL: Config.API_URL,
  timeout: 20000, // Increased global timeout to 20 seconds for heavy AI requests
});

// Prevent toast spam: track if a session-expiry redirect is already in flight
let sessionExpiryHandled = false;

// Request Queueing System to prevent concurrent heavy requests
let activeRequestsCount = 0;
const requestQueue: (() => void)[] = [];
const MAX_CONCURRENT_REQUESTS = 2; // Prevent more than 2 concurrent heavy API requests

const processQueue = () => {
  if (requestQueue.length > 0 && activeRequestsCount < MAX_CONCURRENT_REQUESTS) {
    const nextRequestResolve = requestQueue.shift();
    if (nextRequestResolve) {
      activeRequestsCount++;
      nextRequestResolve();
    }
  }
};

const isHeavyRequest = (url?: string) => {
  if (!url) return false;
  return (
    url.includes('insights') ||
    url.includes('reflections') ||
    url.includes('astrology') ||
    url.includes('ai/') ||
    url.includes('cards/') ||
    url.includes('journal')
  );
};

client.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Orchestrate heavy API requests
  const configAny = config as any;
  if (isHeavyRequest(config.url)) {
    if (configAny.__isRetry) {
      // Retries bypass the queue delay but still contribute to the concurrent active count
      activeRequestsCount++;
    } else {
      await new Promise<void>((resolve) => {
        requestQueue.push(resolve);
        processQueue();
      });
    }
  }

  return config;
});

client.interceptors.response.use(
  (response) => {
    const config = response.config;
    if (config && isHeavyRequest(config.url)) {
      activeRequestsCount--;
      processQueue();
    }
    return response;
  },

  async (error) => {
    const status = error.response?.status;
    const config = error.config as any;

    // Decrement active requests count if the failed request was heavy
    if (config && isHeavyRequest(config.url)) {
      activeRequestsCount--;
      processQueue();
    }

    // Determine if the error is a recoverable network/server issue
    const isNetworkError = !error.response;
    const isServerError = status >= 500 && status <= 599;
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const isRecoverable = isNetworkError || isServerError || isTimeout;

    // Avoid retrying if session is expired
    const isSessionExpired = status === 401 || status === 403 || (status === 404 && error.response?.data?.message === 'Kullanıcı bulunamadı.');

    if (config && isRecoverable && !isSessionExpired) {
      config.__retryCount = config.__retryCount || 0;

      if (config.__retryCount < 2) {
        config.__retryCount += 1;

        // Exponential backoff delay: 1500ms, then 3000ms
        const delay = 1500 * Math.pow(2, config.__retryCount - 1);

        if (__DEV__) {
          console.warn(
            `[API Retry] Recoverable error status: ${status || 'Network/Timeout'}. Retrying attempt ${config.__retryCount}/2 in ${delay}ms for URL: ${config.url}`
          );
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Re-execute request with client
        config.__isRetry = true;
        return client(config);
      }
    }

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

// ── In-Flight request deduplication (caching GET promises) ──────────────────────
const inFlightRequests = new Map<string, Promise<any>>();

const getRequestKey = (config: any) => {
  return `${config.method || 'get'}:${config.url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || {})}`;
};

const originalRequest = client.request.bind(client);

client.request = (config: any) => {
  const method = (config.method || 'get').toLowerCase();

  if (method === 'get') {
    const key = getRequestKey(config);
    if (inFlightRequests.has(key)) {
      if (__DEV__) {
        console.log(`[API Cache] Reusing in-flight GET promise for: ${config.url}`);
      }
      return inFlightRequests.get(key)!;
    }

    const promise = originalRequest(config).then(
      (response) => {
        inFlightRequests.delete(key);
        return response;
      },
      (error) => {
        inFlightRequests.delete(key);
        throw error;
      }
    );

    inFlightRequests.set(key, promise);
    return promise;
  }

  return originalRequest(config);
};

export default client;
