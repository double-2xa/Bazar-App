import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { wishlistApi } from '@/services/endpoints';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@doublea/shared';

export type WishlistItem = { productId: string; product: Product };

export const WISHLIST_QUERY_KEY = ['wishlist'] as const;

function itemProductId(item: WishlistItem) {
  return item.productId ?? item.product?.id;
}

export function useWishlist() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data, isLoading } = useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: wishlistApi.getAll,
    enabled: isAuthenticated,
  });

  const items: WishlistItem[] = data ?? [];
  const wishlistedIds = useMemo(
    () => new Set(items.map(itemProductId).filter(Boolean) as string[]),
    [items],
  );

  const products = useMemo(
    () => items.map((item) => item.product).filter(Boolean),
    [items],
  );

  const isWishlisted = useCallback(
    (productId: string) => wishlistedIds.has(productId),
    [wishlistedIds],
  );

  const mutation = useMutation({
    mutationFn: async ({
      productId,
      currentlyWishlisted,
    }: {
      productId: string;
      currentlyWishlisted: boolean;
      product?: Product;
    }) => {
      if (currentlyWishlisted) {
        return wishlistApi.remove(productId);
      }
      return wishlistApi.add(productId);
    },
    onMutate: async ({ productId, currentlyWishlisted, product }) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });
      const previous = queryClient.getQueryData<WishlistItem[]>(WISHLIST_QUERY_KEY);

      queryClient.setQueryData<WishlistItem[]>(WISHLIST_QUERY_KEY, (old = []) => {
        if (currentlyWishlisted) {
          return old.filter((item) => itemProductId(item) !== productId);
        }
        if (!product) return old;
        return [{ productId, product }, ...old.filter((item) => itemProductId(item) !== productId)];
      });

      return { previous };
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(WISHLIST_QUERY_KEY, context.previous);
      }
      const message = error?.response?.data?.message || 'Could not update wishlist';
      Alert.alert('Wishlist', message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });

  const toggleWishlist = useCallback(
    (productId: string, product?: Product) => {
      if (!isAuthenticated) {
        Alert.alert('Sign in required', 'Please sign in to manage your wishlist.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      mutation.mutate({
        productId,
        currentlyWishlisted: wishlistedIds.has(productId),
        product,
      });
    },
    [isAuthenticated, mutation, wishlistedIds],
  );

  return {
    items,
    products,
    isLoading,
    isWishlisted,
    toggleWishlist,
    isToggling: mutation.isPending,
  };
}
