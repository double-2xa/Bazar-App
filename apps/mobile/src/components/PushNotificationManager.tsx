import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { registerForPushNotifications, subscribeToNotificationNavigation } from '@/services/pushNotifications';

export function PushNotificationManager() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => subscribeToNotificationNavigation(), []);

  useEffect(() => {
    if (isAuthenticated) void registerForPushNotifications();
  }, [isAuthenticated]);

  return null;
}
