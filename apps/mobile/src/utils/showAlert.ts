import { Alert, Platform } from 'react-native';

/** Alert.alert can throw on some web/Expo setups; never let that mask a successful API call. */
export function showAlert(title: string, message: string, onOk?: () => void) {
  try {
    if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
      globalThis.alert(`${title}\n\n${message}`);
      onOk?.();
      return;
    }
    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  } catch {
    onOk?.();
  }
}
