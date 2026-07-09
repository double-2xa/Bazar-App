import { FlatList, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { wishlistApi } from '@/services/endpoints';
import { ProductCard, EmptyState, ScreenContainer } from '@/components';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@doublea/shared';
import { colors, spacing } from '@/theme';
import { useEffect } from 'react';

export default function WishlistScreen() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  const { data } = useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistApi.getAll,
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.remove(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  const products = data?.map((w: { product: Product }) => w.product) || [];

  const handleRemove = (productId: string) => {
    Alert.alert('Remove from wishlist', 'Remove this product from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(productId) },
    ]);
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="heart-outline" title="Wishlist empty" subtitle="Save products you love for later" />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/product/${item.id}`)}
            isWishlisted
            onToggleWishlist={() => handleRemove(item.id)}
          />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: 'space-between', paddingHorizontal: spacing.md },
  list: { paddingBottom: spacing.xl, flexGrow: 1 },
});
