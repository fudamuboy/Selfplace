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
  console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

client.interceptors.response.use(
  (response) => {
    console.log(`[API SUCCESS] ${response.config.method?.toUpperCase()} ${response.config.url} - Status ${response.status}`);
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
    console.error('[API ERROR] Detailed info:', JSON.stringify(errorDetail, null, 2));
    return Promise.reject(error);
  }
);

export default client;
