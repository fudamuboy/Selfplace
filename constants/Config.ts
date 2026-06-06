import { Platform } from 'react-native';

// In development, connect to the local development server. In production, connect to Render.
const LOCAL_API_URL = Platform.OS === 'ios' ? 'http://localhost:5001/api' : 'http://10.0.2.2:5001/api';
const PROD_API_URL = 'https://selfplacebackend.onrender.com/api';

export const API_URL = __DEV__ ? LOCAL_API_URL : PROD_API_URL;

export const Config = {
  API_URL: API_URL,
  IS_PROD: !__DEV__,
  ENV: __DEV__ ? 'development' : 'production',
  PLATFORM: Platform.OS,
};


