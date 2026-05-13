import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const API_URL = 'http://192.168.1.125:5001/api';

export const Config = {
  API_URL: API_URL,
  IS_PROD: false,
  ENV: 'development',
  PLATFORM: Platform.OS,
};

console.log('--- [AUTH DEBUG] Config Loaded ---');
console.log('API_URL:', Config.API_URL);
console.log('ENV:', Config.ENV);
console.log('IS_PROD:', Config.IS_PROD);
console.log('PLATFORM:', Config.PLATFORM);
console.log('---------------------------------');
