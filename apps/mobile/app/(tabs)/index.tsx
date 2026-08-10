import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Category, Product } from '@doublea/shared';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { BRAND } from '@doublea/shared';
import { productsApi, categoriesApi } from '@/services/endpoints';
import {
  ProductCard,
  CategoryCard,
  SectionHeader,
  HomeLoadingSkeleton,
  CompanyPriceToggle,
} from '@/components';
import { useAuthStore } from '@/store/authStore';

const CATEGORY_PREVIEW_LIMIT = 5;

function ProductRail({
  products,
  seeMoreLabel,
  onSeeMore,
}: {
  products: Product[];
  seeMoreLabel?: string;
  onSeeMore?: () => void;
}) {
  return (
    <FlatList
      horizontal
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.railCard}>
          <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
        </View>
      )}
      ListFooterComponent={
        onSeeMore ? (
          <TouchableOpacity style={styles.seeMoreCard} onPress={onSeeMore} activeOpacity={0.85}>
            <View style={styles.seeMoreIcon}>
              <Ionicons name="arrow-forward" size={22} color={colors.primary} />
            </View>
            <Text style={styles.seeMoreText}>{seeMoreLabel ?? 'See more'}</Text>
          </TouchableOpacity>
        ) : null
      }
      contentContainerStyle={styles.railList}
      showsHorizontalScrollIndicator={false}
    />
  );
}

function CategoryProductSection({ category }: { category: Category }) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'home-category', category.id],
    queryFn: () => productsApi.getAll({ categoryId: category.id, limit: CATEGORY_PREVIEW_LIMIT }),
  });

  const products = data?.data ?? [];
  if (!isLoading && products.length === 0) return null;

  const openCategory = () => router.push(`/category/${category.slug}`);

  return (
    <View>
      <SectionHeader title={category.name} actionLabel="See more" onAction={openCategory} />
      {isLoading ? (
        <Text style={styles.loadingRow}>Loading {category.name}…</Text>
      ) : (
        <ProductRail products={products} seeMoreLabel="See more" onSeeMore={openCategory} />
      )}
    </View>
  );
}

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const { user, showCompanyPrice, setShowCompanyPrice } = useAuthStore();
  const isCompany = user?.role === 'company' && user.companyProfile?.status === 'approved';

  const {
    data: categories,
    isLoading: catLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const {
    data: featured,
    isLoading: featLoading,
    refetch: refetchFeatured,
  } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productsApi.getAll({ featured: true, limit: 6 }),
  });

  const {
    data: topSellers,
    isLoading: topLoading,
    refetch: refetchTopSellers,
    isRefetching,
  } = useQuery({
    queryKey: ['products', 'top-sellers'],
    queryFn: () => productsApi.getAll({ sortBy: 'sold', sortOrder: 'desc', limit: 6 }),
  });

  const loading = catLoading || featLoading || topLoading;

  const refreshHome = () => {
    void refetchCategories();
    void refetchFeatured();
    void refetchTopSellers();
    void queryClient.invalidateQueries({ queryKey: ['products', 'home-category'] });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <HomeLoadingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refreshHome} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brandName}>{BRAND.shopName}</Text>
        </View>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color={colors.mutedText} />
          <Text style={styles.searchPlaceholder}>Search products, brands...</Text>
        </TouchableOpacity>

        {isCompany && (
          <View style={styles.companyToggle}>
            <CompanyPriceToggle showCompanyPrice={showCompanyPrice} onToggle={setShowCompanyPrice} />
          </View>
        )}

        <SectionHeader
          title="Categories"
          actionLabel="See all"
          onAction={() => router.push('/(tabs)/categories')}
        />
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CategoryCard category={item} onPress={() => router.push(`/category/${item.slug}`)} />
          )}
          contentContainerStyle={styles.categoryList}
          showsHorizontalScrollIndicator={false}
        />

        <SectionHeader title="Top Sellers" />
        <ProductRail products={topSellers?.data ?? []} />

        <SectionHeader title="Featured" />
        <ProductRail products={featured?.data ?? []} />

        {(categories ?? []).map((category) => (
          <CategoryProductSection key={category.id} category={category} />
        ))}

        <View style={{ height: spacing.tabBarOffset }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  brandName: { ...typography.h3, color: colors.primary, fontWeight: '800', marginBottom: spacing.xs },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchPlaceholder: { ...typography.body, color: colors.mutedText, flex: 1 },
  companyToggle: { paddingHorizontal: spacing.md },
  categoryList: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  railList: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  railCard: { marginRight: spacing.sm },
  seeMoreCard: {
    width: 120,
    marginRight: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    ...shadows.sm,
  },
  seeMoreIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  seeMoreText: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
  loadingRow: {
    ...typography.bodySmall,
    color: colors.mutedText,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
});
