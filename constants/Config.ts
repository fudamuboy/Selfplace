import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const API_URL = 'https://selfplacebackend.onrender.com/api';

export const Config = {
  API_URL: API_URL,
  IS_PROD: true,
  ENV: 'production',
  PLATFORM: Platform.OS,
};

