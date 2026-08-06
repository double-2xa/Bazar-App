import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { productsApi } from '@/services/endpoints';
import { BRAND } from '@doublea/shared';
import { ProductCard, ProductCardSkeleton, EmptyState, GlassSearchBar, ScreenContainer } from '@/components';
import { useDebounce } from '@/hooks/useDebounce';
import { colors, spacing, radius, typography } from '@/theme';

const PRICE_FILTERS = [
  { key: 'asc', label: 'Price: Low → High' },
  { key: 'desc', label: 'Price: High → Low' },
] as const;

export default function SearchScreen() {
  const [search, setSearch] = useState('');
  const [priceOrder, setPriceOrder] = useState<(typeof PRICE_FILTERS)[number]['key']>('asc');
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', 'search', debouncedSearch, priceOrder],
    queryFn: () => {
      const params: Record<string, string | number | boolean> = {
        sortBy: 'price',
        sortOrder: priceOrder,
        limit: 30,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      return productsApi.getAll(params);
    },
  });

  return (
    <ScreenContainer scroll={false} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Find products at {BRAND.shopName}</Text>
      </View>

      <GlassSearchBar
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
        autoFocus
      />

      <View style={styles.filters}>
        {PRICE_FILTERS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[styles.filterChip, priceOrder === option.key && styles.filterActive]}
            onPress={() => setPriceOrder(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: priceOrder === option.key }}
          >
            <Text style={[styles.filterText, priceOrder === option.key && styles.filterTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Search unavailable"
          subtitle="Check your connection and try again"
          action={<Text style={styles.retry} onPress={() => refetch()}>Retry</Text>}
        />
      ) : (
        <FlatList
          data={data?.data}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No products found"
              subtitle={debouncedSearch ? `No results for "${debouncedSearch}"` : 'Try a different search term'}
            />
          }
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.mutedText, marginTop: 4 },
  searchBar: { marginHorizontal: spacing.md, marginTop: spacing.md },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  filterText: { ...typography.bodySmall, color: colors.mutedText, fontWeight: '500' },
  filterTextActive: { color: colors.primaryDark, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md },
  row: { justifyContent: 'space-between', paddingHorizontal: spacing.md },
  list: { paddingBottom: spacing.xxl + 80, flexGrow: 1 },
  retry: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
