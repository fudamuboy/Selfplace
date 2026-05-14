import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import { Config } from '../constants/Config';



const client = axios.create({
  baseURL: Config.API_URL,
});

client.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

client.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const errorDetail = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
    };

    // Auto-logout if user is not found or session is invalid (Bug fix for multi-user/multi-env)
    if (error.response?.status === 401 || 
       (error.response?.status === 404 && error.response?.data?.message === 'Kullanıcı bulunamadı.')) {
      useAuthStore.getState().logout();
    }

    if (__DEV__) {
      console.error('[API ERROR] Detailed info:', JSON.stringify(errorDetail, null, 2));
    }

    // Graceful error handling for Network Errors
    if (!error.response) {
      error.message = "Bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol edin.";
    }

    return Promise.reject(error);
  }
);

export default client;
