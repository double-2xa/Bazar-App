import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/services/endpoints';
import { ProductCard, ProductCardSkeleton, EmptyState, ScreenContainer } from '@/components';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useProductGridColumns } from '@/layout/webLayout';
import { colors, spacing, typography } from '@/theme';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { addToCart } = useAddToCart();
  const columns = useProductGridColumns();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const category = categories?.find((c) => c.slug === slug);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['products', 'category', category?.id],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => productsApi.getAll({ categoryId: category!.id, limit: 30, page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: !!category?.id,
  });
  const products = data?.pages.flatMap((result) => result.data) ?? [];

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{category?.name ?? 'Category'}</Text>
        {category?.description ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {category.description}
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <FlatList
          key={`category-loading-${columns}`}
          data={[1, 2, 3, 4, 5, 6, 7, 8].slice(0, columns * 2)}
          numColumns={columns}
          keyExtractor={(item) => String(item)}
          columnWrapperStyle={styles.row}
          renderItem={() => <ProductCardSkeleton />}
        />
      ) : !category ? (
        <EmptyState icon="grid-outline" title="Category not found" subtitle="This category may have been removed" />
      ) : (
        <FlatList
          key={`category-grid-${columns}`}
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
          onEndReachedThreshold={0.6}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ margin: spacing.md }} color={colors.primary} /> : null}
          ListEmptyComponent={
            <EmptyState title="No products" subtitle={`Nothing in ${category.name} yet`} />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onAddToCart={(origin) => addToCart(item, 1, undefined, origin)}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.mutedText, marginTop: 4 },
  row: { justifyContent: 'space-between', paddingHorizontal: spacing.md },
  list: { paddingBottom: spacing.xl, flexGrow: 1 },
});
