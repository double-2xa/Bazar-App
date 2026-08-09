/**
 * Expo push notifications are native-only in this application.
 * Keeping a web-specific module prevents native notification APIs from being
 * initialized by the browser bundle.
 */
export async function registerForPushNotifications() {
  return null;
}

export async function unregisterPushNotifications() {
  // No Expo push token exists on web.
}

export function subscribeToNotificationNavigation() {
  return () => undefined;
}
