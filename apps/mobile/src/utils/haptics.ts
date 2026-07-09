import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function hapticLight() {
  if (Platform.OS === 'ios') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export async function hapticSuccess() {
  if (Platform.OS === 'ios') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

export async function hapticSelection() {
  if (Platform.OS === 'ios') {
    await Haptics.selectionAsync();
  }
}
