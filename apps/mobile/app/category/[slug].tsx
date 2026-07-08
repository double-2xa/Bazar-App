import { useLocalSearchParams, router } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { productsApi } from '@/services/endpoints';
import { ProductCard, ProductCardSkeleton, EmptyState } from '@/components';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'category', slug],
    queryFn: () => productsApi.getAll({ limit: 30 }),
  });

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <FlatList data={[1, 2, 3, 4]} numColumns={2} renderItem={() => <ProductCardSkeleton />} />
      ) : (
        <FlatList
          data={data?.data}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="No products" subtitle="This category is empty" />}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: { justifyContent: 'space-between', paddingHorizontal: spacing.md },
  list: { paddingBottom: spacing.xl },
});
