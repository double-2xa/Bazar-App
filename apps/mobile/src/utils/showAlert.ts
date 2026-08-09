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

/** Browser-safe confirmation with the native Alert equivalent on iOS/Android. */
export function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof globalThis.confirm === 'function'
        ? globalThis.confirm(`${title}\n\n${message}`)
        : true,
    );
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Sign Out', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
