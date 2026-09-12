import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { Product, PriceType } from '@doublea/shared';
import { useAuthStore } from '@/store/authStore';
import { cartApi } from '@/services/endpoints';
import { hapticSuccess, hapticLight } from '@/utils/haptics';
import { useCartFeedbackStore, type CartFeedbackOrigin } from '@/store/cartFeedbackStore';
import { resolveApiAssetUrl } from '@/services/resolveApiAssetUrl';

export function useAddToCart() {
  const { isAuthenticated, user, showCompanyPrice, addToGuestCart } = useAuthStore();
  const queryClient = useQueryClient();
  const showAdded = useCartFeedbackStore((state) => state.showAdded);

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
    async (
      product: Product,
      quantity = 1,
      priceType?: PriceType,
      origin?: CartFeedbackOrigin,
    ) => {
      const selectedPriceType = isAuthenticated ? getPriceType(priceType) : 'normal';
      await hapticLight();

      try {
        if (isAuthenticated) {
          await queryClient.cancelQueries({ queryKey: ['cart'] });
          const updatedCart = await cartApi.addItem(product.id, quantity, selectedPriceType);
          queryClient.setQueryData(['cart'], updatedCart);
        } else {
          addToGuestCart(product, quantity, selectedPriceType);
        }
        showAdded({
          productName: product.name,
          imageUrl: resolveApiAssetUrl(product.imageUrl || product.images?.[0]?.imageUrl),
          quantity,
          origin,
        });
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
    [isAuthenticated, getPriceType, addToGuestCart, queryClient, showAdded],
  );

  return { addToCart, getPriceType };
}
