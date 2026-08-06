import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BRAND } from '@doublea/shared';
import { categoriesApi } from '@/services/endpoints';
import { CategoryCard, EmptyState, ScreenContainer, LoadingSkeleton } from '@/components';
import { colors, spacing, typography } from '@/theme';

export default function CategoriesScreen() {
  const { data: categories, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  return (
    <ScreenContainer scroll={false} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Browse all departments at {BRAND.shopName}</Text>
      </View>

      {isLoading ? (
        <View style={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <LoadingSkeleton key={i} width="48%" height={160} style={styles.skeleton} />
          ))}
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Categories unavailable"
          subtitle="Check your connection and try again"
          action={
            <Text style={styles.retry} onPress={() => refetch()}>
              Retry
            </Text>
          }
        />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="grid-outline"
              title="No categories yet"
              subtitle="Check back soon for new departments"
            />
          }
          renderItem={({ item }) => (
            <CategoryCard
              category={item}
              variant="grid"
              onPress={() => router.push(`/category/${item.slug}`)}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.mutedText, marginTop: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  skeleton: { marginBottom: spacing.md, borderRadius: 12 },
  row: { justifyContent: 'space-between', paddingHorizontal: spacing.md },
  list: { paddingBottom: spacing.xxl + 80, flexGrow: 1 },
  retry: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
