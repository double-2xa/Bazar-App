import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PREFIX = 'doublea_';

async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(PREFIX + key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(PREFIX + key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(PREFIX + key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = { getItemAsync, setItemAsync, deleteItemAsync };
