import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { Config } from '../constants/Config';
import { t } from '../i18n';

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
  const currentLang = useLanguageStore.getState().language || 'tr';
  config.headers['Accept-Language'] = currentLang;
  config.headers['x-app-language'] = currentLang;

  if (__DEV__) {
    const ts = new Date().toISOString();
    console.log(
      `[AUTH-TRACE REQUEST] ${ts}\n` +
      `  URL    : ${config.url}\n` +
      `  Method : ${(config.method || 'get').toUpperCase()}\n` +
      `  Auth   : ${config.headers.Authorization ? `Bearer ${token?.slice(0, 12)}...` : 'NONE'}\n` +
      `  Zustand: ${token ? token.slice(0, 12) + '...' : 'NULL'}`
    );
  }

  // Orchestrate heavy API requests
  const configAny = config as any;
  if (isHeavyRequest(config.url)) {
    if (configAny.__isRetry) {
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
    const isSessionExpired = status === 401 || status === 403 || (status === 404 && (error.response?.data?.message === 'Kullanıcı bulunamadı.' || error.response?.data?.message === 'User not found.'));

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

    // ── Session expiry ──────────────────────────────────────────────────────
    if (isSessionExpired) {
      const authHeader = config?.headers?.Authorization;
      const requestToken = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : null;
      const currentToken = useAuthStore.getState().token || null;

      const ts = new Date().toISOString();
      console.warn(
        `[AUTH-TRACE SESSION-EXPIRY] ${ts}\n` +
        `  URL          : ${config?.url}\n` +
        `  Method       : ${(config?.method || 'get').toUpperCase()}\n` +
        `  HTTP Status  : ${status}\n` +
        `  Request token: ${requestToken ? requestToken.slice(0, 12) + '...' : 'NONE'}\n` +
        `  Zustand token: ${currentToken ? currentToken.slice(0, 12) + '...' : 'NULL'}\n` +
        `  Token match  : ${requestToken === currentToken ? 'YES ← this is a real expiry' : 'NO ← stale/obsolete request'}`
      );

      if (requestToken !== currentToken) {
        console.warn('[AUTH-TRACE] OBSOLETE TOKEN — ignoring 401. Session is still valid.');
        const obsoleteError = new Error('OBSOLETE_TOKEN');
        (obsoleteError as any).isObsolete = true;
        return Promise.reject(obsoleteError);
      }

      if (!currentToken) {
        console.warn('[AUTH-TRACE] UNAUTHENTICATED — no current token. Ignoring 401.');
        const unauthError = new Error('UNAUTHENTICATED');
        (unauthError as any).isUnauthenticated = true;
        return Promise.reject(unauthError);
      }

      if (!sessionExpiryHandled) {
        sessionExpiryHandled = true;
        console.warn('[AUTH-TRACE] REAL SESSION EXPIRY — calling handleSessionExpiry()');
        console.trace('[AUTH-TRACE] SESSION EXPIRED call stack');
        useAuthStore.getState().handleSessionExpiry();
        setTimeout(() => {
          sessionExpiryHandled = false;
        }, 3000);
      }

      const sessionError = new Error('SESSION_EXPIRED');
      (sessionError as any).isSessionExpiry = true;
      return Promise.reject(sessionError);
    }

    // ── Network / no-response errors ────────────────────────────────────────
    if (!error.response) {
      const currentLang = useLanguageStore.getState().language || 'tr';
      error.message = currentLang === 'en'
        ? 'Could not connect. Please check your internet connection.'
        : 'Bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol edin.';
    } else {
      // Screens display err.message; replace axios' technical English ("Request failed with status code …")
      // with the backend's localized message, or a localized generic error.
      const serverMessage = error.response?.data?.message;
      error.message = typeof serverMessage === 'string' && serverMessage ? serverMessage : t('errors.generic');
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
  // CRITICAL: get the token directly from the Zustand store.
  // Axios request interceptors (which populate headers.Authorization)
  // run AFTER client.request() wrapper checks, meaning config.headers
  // is undefined here. Directly fetching the token guarantees isolation.
  const token = useAuthStore.getState().token || '';
  const currentLang = useLanguageStore.getState().language || 'tr';
  return `${config.method || 'get'}:${config.url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || {})}:${token}:${currentLang}`;
};

const originalRequest = client.request.bind(client);

client.request = (config: any) => {
  const method = (config.method || 'get').toLowerCase();

  if (method === 'get') {
    const key = getRequestKey(config);
    if (inFlightRequests.has(key)) {
      if (__DEV__) {
        // [API Cache] Reusing in-flight GET promise
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
