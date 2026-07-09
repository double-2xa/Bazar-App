import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsApi, categoriesApi, bannersApi, addressesApi } from '@/services/endpoints';
import {
  ProductCard,
  CategoryCard,
  SectionHeader,
  HomeLoadingSkeleton,
  CompanyPriceToggle,
  GlassSearchBar,
  ScreenContainer,
} from '@/components';
import { useAuthStore } from '@/store/authStore';
import { useAddToCart } from '@/hooks/useAddToCart';
import { colors, spacing, radius, typography, shadows } from '@/theme';

export default function HomeScreen() {
  const { user, showCompanyPrice, setShowCompanyPrice, isAuthenticated } = useAuthStore();
  const { addToCart } = useAddToCart();
  const isCompany = user?.role === 'company' && user.companyProfile?.status === 'approved';

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressesApi.getAll,
    enabled: isAuthenticated,
  });

  const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0];
  const locationLabel = defaultAddress
    ? `${defaultAddress.city}${defaultAddress.street ? `, ${defaultAddress.street}` : ''}`
    : isAuthenticated
      ? 'Add delivery address'
      : 'Browse & shop anywhere';

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
      <ScreenContainer scroll={false}>
        <HomeLoadingSkeleton />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      bottomInset={spacing.xxl + 80}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>DA</Text>
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandTitle}>DoubleA</Text>
          <Text style={styles.brandSubtitle}>Commerce · Geo-ready delivery</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.locationRow}
        onPress={() => (isAuthenticated ? router.push('/addresses') : router.push('/(auth)/login'))}
        accessibilityLabel="Delivery location"
        accessibilityRole="button"
      >
        <View style={styles.locationIcon}>
          <Ionicons name="location" size={18} color={colors.mapAccent} />
        </View>
        <View style={styles.locationTextWrap}>
          <Text style={styles.deliverTo}>Deliver to</Text>
          <Text style={styles.location} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
      </TouchableOpacity>

      <GlassSearchBar
        value=""
        onChangeText={() => {}}
        editable={false}
        onPress={() => router.push('/(tabs)/search')}
        style={styles.searchBar}
        placeholder="Search products, brands, categories..."
      />

      {isCompany && (
        <View style={styles.companyToggle}>
          <CompanyPriceToggle showCompanyPrice={showCompanyPrice} onToggle={setShowCompanyPrice} />
        </View>
      )}

      {user?.role === 'company' && user.companyProfile?.status === 'pending' && (
        <View style={styles.pendingBanner}>
          <Ionicons name="time-outline" size={18} color={colors.warning} />
          <Text style={styles.pendingText}>Wholesale account pending approval</Text>
        </View>
      )}

      {banners && banners.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bannerScroll}
          contentContainerStyle={styles.bannerList}
        >
          {banners.map((item: { id: string; imageUrl: string; title: string; subtitle?: string }) => (
            <View key={item.id} style={styles.bannerCard}>
              <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} />
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.bannerSubtitle}>{item.subtitle}</Text> : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <SectionHeader title="Shop by category" actionLabel="Browse" onAction={() => router.push('/(tabs)/search')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
      >
        {categories?.map((item) => (
          <CategoryCard key={item.id} category={item} onPress={() => router.push(`/category/${item.slug}`)} />
        ))}
      </ScrollView>

      <SectionHeader title="Featured picks" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredList}
      >
        {featured?.data?.map((item) => (
          <View key={item.id} style={styles.featuredCard}>
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onAddToCart={() => addToCart(item)}
            />
          </View>
        ))}
      </ScrollView>

      <SectionHeader title="Recommended for you" />
      <View style={styles.productGrid}>
        {products?.data?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onPress={() => router.push(`/product/${product.id}`)}
            onAddToCart={() => addToCart(product)}
          />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  brandCopy: { flex: 1 },
  brandTitle: { ...typography.h2, color: colors.text },
  brandSubtitle: { ...typography.caption, color: colors.mutedText, marginTop: 2 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: { flex: 1 },
  deliverTo: { ...typography.caption, color: colors.mutedText },
  location: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
  searchBar: { marginHorizontal: spacing.md, marginTop: spacing.md },
  companyToggle: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: radius.md,
  },
  pendingText: { ...typography.bodySmall, color: colors.warning, fontWeight: '600' },
  bannerScroll: { marginTop: spacing.md },
  bannerList: { paddingLeft: spacing.md },
  bannerCard: {
    width: 300,
    height: 148,
    marginRight: spacing.md,
    borderRadius: radius.lg,
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
