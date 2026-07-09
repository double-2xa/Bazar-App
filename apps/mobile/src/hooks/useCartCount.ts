import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { cartApi } from '@/services/endpoints';

export function useCartCount() {
  const { isAuthenticated, getGuestCartCount } = useAuthStore();

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: isAuthenticated,
    staleTime: 10000,
  });

  if (!isAuthenticated) {
    return getGuestCartCount();
  }

  return cart?.items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) ?? 0;
}
