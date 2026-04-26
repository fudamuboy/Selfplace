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

export default client;
