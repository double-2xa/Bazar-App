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
