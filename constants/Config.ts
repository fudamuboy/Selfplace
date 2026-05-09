import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PROD_URL = 'https://selfplacebackend.onrender.com/api';

// For local development with Expo
const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
const DEV_URL = `http://${localhost}:5001/api`;

// Force production for final testing on real devices (Expo Go)
// SET THIS TO TRUE to test the Render backend on your phone before TestFlight
const FORCE_PROD = true; 

const useProd = !__DEV__ || FORCE_PROD; 

export const Config = {
  API_URL: useProd ? PROD_URL : DEV_URL,
  IS_PROD: useProd,
  ENV: __DEV__ ? 'development' : 'production',
  PLATFORM: Platform.OS,
};

console.log('--- [AUTH DEBUG] Config Loaded ---');
console.log('API_URL:', Config.API_URL);
console.log('ENV:', Config.ENV);
console.log('IS_PROD:', Config.IS_PROD);
console.log('PLATFORM:', Config.PLATFORM);
console.log('---------------------------------');
