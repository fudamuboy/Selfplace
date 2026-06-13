import axios from 'axios';

export const logger = {
  warn: (message: string, error?: any) => {
    if (__DEV__) {
      console.warn(`[WARN] ${message}`, error || '');
    }
  },
  error: (message: string, error?: any) => {
    const isAxiosError = axios.isAxiosError(error);
    const isNetworkError = isAxiosError && !error.response;
    const isRecoverable = isNetworkError || (error && (error.isSessionExpiry || error.message === 'SESSION_EXPIRED'));

    if (isRecoverable) {
      if (__DEV__) {
        console.warn(`[Recoverable Network/Auth Error] ${message}:`, error.message || error);
      }
    } else {
      if (__DEV__) {
        // Use console.warn to avoid triggering React Native Redbox overlays in development mode for expected errors,
        // while still providing prominent logs in the terminal/console.
        console.warn(`[Non-Recoverable Error] ${message}:`, error || '');
      }
    }
  },
  info: (message: string, ...args: any[]) => {
    if (__DEV__) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }
};
