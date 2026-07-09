import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { Product, PriceType } from '@doublea/shared';
import { useAuthStore } from '@/store/authStore';
import { cartApi } from '@/services/endpoints';
import { hapticSuccess, hapticLight } from '@/utils/haptics';

export function useAddToCart() {
  const { isAuthenticated, user, showCompanyPrice, addToGuestCart } = useAuthStore();
  const queryClient = useQueryClient();

  const getPriceType = useCallback(
    (override?: PriceType): PriceType => {
      if (override) return override;
      const isCompany =
        user?.role === 'company' && user.companyProfile?.status === 'approved' && showCompanyPrice;
      return isCompany ? 'company' : 'normal';
    },
    [user, showCompanyPrice],
  );

  const addToCart = useCallback(
    async (product: Product, quantity = 1, priceType?: PriceType) => {
      const selectedPriceType = getPriceType(priceType);
      await hapticLight();

      try {
        if (isAuthenticated) {
          await cartApi.addItem(product.id, quantity, selectedPriceType);
          await queryClient.invalidateQueries({ queryKey: ['cart'] });
        } else {
          addToGuestCart(product, quantity, selectedPriceType);
        }
        await hapticSuccess();
        return true;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not add to cart';
        Alert.alert('Cart', message);
        return false;
      }
    },
    [isAuthenticated, getPriceType, addToGuestCart, queryClient],
  );

  return { addToCart, getPriceType };
}
