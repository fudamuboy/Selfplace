import { Platform } from 'react-native';

const PROD_API_URL = 'https://selfplacebackend.onrender.com/api';

export const API_URL = PROD_API_URL;

export const Config = {
  API_URL: API_URL,
  IS_PROD: !__DEV__,
  ENV: __DEV__ ? 'development' : 'production',
  PLATFORM: Platform.OS,
};


