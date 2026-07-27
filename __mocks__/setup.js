// Global test setup: expose __DEV__ so RN / Expo modules don't crash
global.__DEV__ = false;

// Silence console.warn from the interceptor's [API] diagnostics during tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
