import { create } from 'zustand';
import axios from 'axios';
import { Config } from '../constants/Config';

interface NetworkState {
  isOnline: boolean;
  listeners: (() => void)[];
  checkConnectivity: () => Promise<boolean>;
  subscribeToRefresh: (listener: () => void) => () => void;
  triggerGlobalRefresh: () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: true,
  listeners: [],
  checkConnectivity: async () => {
    try {
      // Hitting the Render backend root path directly overrides default /api prefix to avoid DB load
      await axios.get('/', { baseURL: Config.API_URL.replace('/api', ''), timeout: 3000 });
      set({ isOnline: true });
      return true;
    } catch (err: any) {
      // If there is no response, it's a connection timeout/offline error.
      // If there's an HTTP response (even a 404/500), the server is online and reached.
      const offline = !err.response;
      set({ isOnline: !offline });
      return !offline;
    }
  },
  subscribeToRefresh: (listener) => {
    set((state) => ({ listeners: [...state.listeners, listener] }));
    return () => {
      set((state) => ({ listeners: state.listeners.filter((l) => l !== listener) }));
    };
  },
  triggerGlobalRefresh: () => {
    get().listeners.forEach((listener) => {
      try {
        listener();
      } catch (_e) {}
    });
  },
}));
