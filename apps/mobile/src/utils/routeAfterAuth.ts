import { router } from 'expo-router';
import type { UserPublic } from '@doublea/shared';
import { isCompanyAwaitingAccess } from '@/utils/companyAccess';

/** Shared post-login / post-register navigation. */
export function routeAfterAuth(user: UserPublic) {
  if (user.role === 'admin') {
    router.replace('/(tabs)');
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
