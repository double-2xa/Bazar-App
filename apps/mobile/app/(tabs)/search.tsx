import { useState } from 'react';
import { View, TextInput, FlatList, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/theme';
import { productsApi } from '@/services/endpoints';
import { ProductCard, ProductCardSkeleton, EmptyState } from '@/components';

export default function SearchScreen() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'search', search, sortBy],
    queryFn: () =>
      productsApi.getAll({
        search: search || undefined,
        sortBy,
        sortOrder: sortBy === 'price' ? 'asc' : 'desc',
        limit: 30,
      }),
    enabled: true,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} color={colors.mutedText} />
        <TextInput
          style={styles.input}
          placeholder="Search products..."
          placeholderTextColor={colors.mutedText}
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      <View style={styles.filters}>
        {['createdAt', 'price', 'rating'].map((s) => (
          <Text
            key={s}
            style={[styles.filterChip, sortBy === s && styles.filterActive]}
            onPress={() => setSortBy(s)}
          >
            {s === 'createdAt' ? 'Newest' : s === 'price' ? 'Price' : 'Rating'}
          </Text>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </View>
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
              subtitle="Try a different search term"
            />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 12 },
  filters: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  filterChip: {
    ...typography.bodySmall,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    color: colors.mutedText,
    overflow: 'hidden',
  },
  filterActive: { backgroundColor: colors.primary, color: colors.secondary, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md },
  row: { justifyContent: 'space-between', paddingHorizontal: spacing.md },
  list: { paddingBottom: spacing.xl },
});
