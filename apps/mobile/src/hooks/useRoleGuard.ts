import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

type AllowedRole = 'shopper' | 'delivery_agent';

interface UseRoleGuardOptions {
  allowed: AllowedRole;
}

export function useRoleGuard({ allowed }: UseRoleGuardOptions) {
  const { user, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (user?.role === 'admin') {
      router.replace('/(auth)/login');
      return;
    }

    if (allowed === 'delivery_agent') {
      if (!isAuthenticated || user?.role !== 'delivery_agent') {
        router.replace('/(tabs)');
      }
      return;
    }

    if (allowed === 'shopper' && user?.role === 'delivery_agent') {
      router.replace('/(delivery)');
    }
  }, [isLoading, isAuthenticated, user, allowed]);
}
