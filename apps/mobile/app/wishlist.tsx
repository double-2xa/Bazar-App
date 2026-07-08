import { FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { wishlistApi } from '@/services/endpoints';
import { ProductCard, EmptyState } from '@/components';
import type { Product } from '@doublea/shared';

export default function WishlistScreen() {
  const { data, isLoading } = useQuery({ queryKey: ['wishlist'], queryFn: wishlistApi.getAll });

  const products = data?.map((w: { product: Product }) => w.product) || [];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="heart-outline" title="Wishlist empty" subtitle="Save products you love" />}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} isWishlisted />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: { justifyContent: 'space-between', paddingHorizontal: spacing.md },
  list: { paddingBottom: spacing.xl, flexGrow: 1 },
});
