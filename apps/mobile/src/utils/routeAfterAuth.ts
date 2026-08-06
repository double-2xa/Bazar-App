import { Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import type { UserPublic } from '@doublea/shared';
import { useAuthStore } from '@/store/authStore';
import { isCompanyAwaitingAccess } from '@/utils/companyAccess';

/** Shared post-login / post-register navigation. */
export function routeAfterAuth(user: UserPublic) {
  if (user.role === 'admin') {
    Alert.alert(
      'Admin Account',
      'Please use the admin dashboard website to manage the store.',
      [
        {
          text: 'Open Dashboard',
          onPress: () => Linking.openURL(process.env.EXPO_PUBLIC_ADMIN_URL || 'http://localhost:3000'),
        },
        {
          text: 'OK',
          onPress: () => {
            useAuthStore.getState().logout();
          },
        },
      ],
    );
    return;
  }
  if (user.role === 'delivery_agent') {
    router.replace('/(delivery)');
    return;
  }
  if (isCompanyAwaitingAccess(user)) {
    router.replace('/company-pending');
    return;
  }
  router.replace('/(tabs)');
}
