import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { notificationsApi } from './endpoints';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let currentToken: string | null = null;

function openNotification(response: Notifications.NotificationResponse | null) {
  const route = response?.notification.request.content.data?.route;
  if (typeof route === 'string' && route.startsWith('/') && !route.startsWith('//')) {
    router.push(route as never);
  }
}

export async function registerForPushNotifications() {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      sound: 'default',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === 'granted'
    ? existing
    : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const projectId = Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId
    ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) {
    console.warn('Push notifications require an EAS projectId.');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await notificationsApi.registerPushToken(token, Platform.OS as 'android' | 'ios');
  currentToken = token;
  return token;
}

export async function unregisterPushNotifications() {
  if (!currentToken) return;
  await notificationsApi.unregisterPushToken(currentToken).catch(() => undefined);
  currentToken = null;
}

export function subscribeToNotificationNavigation() {
  void Notifications.getLastNotificationResponseAsync().then(openNotification);
  const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
  return () => subscription.remove();
}
