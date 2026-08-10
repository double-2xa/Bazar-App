import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
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

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'category', category?.id],
    queryFn: () => productsApi.getAll({ categoryId: category!.id, limit: 30 }),
    enabled: !!category?.id,
  });

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
          data={data?.data}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title="No products" subtitle={`Nothing in ${category.name} yet`} />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onAddToCart={() => addToCart(item)}
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
