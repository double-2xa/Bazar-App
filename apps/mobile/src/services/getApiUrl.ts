import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getDevServerHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.linkingUri ??
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;

  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  return host || null;
}

export function getApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  const devHost = __DEV__ ? getDevServerHost() : null;

  // Expo web: browser CORS blocks the production API from localhost, so use local API.
  if (__DEV__ && Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_API_URL_WEB || 'http://localhost:3001/api';
  }

  // Native Expo Go / emulators in development: hit the machine running the API.
  // Uploaded images live on that host's /uploads folder — production URLs 404 them.
  if (__DEV__ && Platform.OS !== 'web' && process.env.EXPO_PUBLIC_USE_PROD_API !== 'true') {
    if (devHost) return `http://${devHost}:3001/api`;
    if (Platform.OS === 'android') return 'http://10.0.2.2:3001/api';
    return 'http://localhost:3001/api';
  }

  if (configured) {
    if (__DEV__ && devHost && configured.includes('localhost')) {
      return configured.replace('localhost', devHost);
    }
    return configured;
  }

  if (__DEV__ && devHost) {
    return `http://${devHost}:3001/api`;
  }

  if (Platform.OS === 'android' && __DEV__) {
    return 'http://10.0.2.2:3001/api';
  }

  return 'http://localhost:3001/api';
}
