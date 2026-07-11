import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { BRAND } from '@doublea/shared';
import { productsApi, categoriesApi, bannersApi } from '@/services/endpoints';
import {
  ProductCard,
  CategoryCard,
  SectionHeader,
  HomeLoadingSkeleton,
  CompanyPriceToggle,
} from '@/components';
import { useAuthStore } from '@/store/authStore';

export default function HomeScreen() {
  const { user, showCompanyPrice, setShowCompanyPrice } = useAuthStore();
  const isCompany = user?.role === 'company' && user.companyProfile?.status === 'approved';

  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const { data: featured, isLoading: featLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productsApi.getAll({ featured: true, limit: 6 }),
  });

  const { data: products, isLoading: prodLoading, refetch, isRefetching } = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => productsApi.getAll({ limit: 10, sortBy: 'rating', sortOrder: 'desc' }),
  });

  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: bannersApi.getAll,
  });

  const loading = catLoading || featLoading || prodLoading;

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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brandName}>{BRAND.shopName}</Text>
          <TouchableOpacity style={styles.locationRow}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <View>
              <Text style={styles.deliverTo}>Deliver to</Text>
              <Text style={styles.location}>New York, NY</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.mutedText} />
          </TouchableOpacity>
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

        {banners && banners.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannerScroll}>
            {banners.map((banner: { id: string; imageUrl: string; title: string; subtitle?: string }) => (
              <View key={banner.id} style={styles.bannerCard}>
                <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} />
                <View style={styles.bannerOverlay}>
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  {banner.subtitle && <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <SectionHeader title="Categories" actionLabel="See all" onAction={() => router.push('/(tabs)/search')} />
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

        <SectionHeader title="Featured" />
        <FlatList
          horizontal
          data={featured?.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.featuredCard}>
              <ProductCard
                product={item}
                onPress={() => router.push(`/product/${item.id}`)}
              />
            </View>
          )}
          contentContainerStyle={styles.featuredList}
          showsHorizontalScrollIndicator={false}
        />

        <SectionHeader title="Recommended for You" />
        <View style={styles.productGrid}>
          {products?.data?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}`)}
            />
          ))}
        </View>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  brandName: { ...typography.h3, color: colors.primary, fontWeight: '800', marginBottom: spacing.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deliverTo: { ...typography.caption, color: colors.mutedText },
  location: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
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
  bannerScroll: { marginTop: spacing.md },
  bannerCard: {
    width: 300,
    height: 140,
    marginLeft: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bannerTitle: { ...typography.h3, color: colors.surface },
  bannerSubtitle: { ...typography.bodySmall, color: colors.surface, opacity: 0.9 },
  categoryList: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  featuredList: { paddingHorizontal: spacing.md },
  featuredCard: { marginRight: spacing.sm },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
});
