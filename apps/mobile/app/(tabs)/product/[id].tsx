import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '@/services/endpoints';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { useWishlist } from '@/hooks/useWishlist';
import {
  AppButton,
  PriceDisplay,
  CompanyPriceToggle,
  ProductCard,
  Badge,
  LoadingSkeleton,
  HorizontalNavRow,
} from '@/components';
import { useAppLayoutWidth } from '@/layout/webLayout';
import { useAddToCart } from '@/hooks/useAddToCart';
import type { GestureResponderEvent } from 'react-native';
import { resolveApiAssetUrl } from '@/services/resolveApiAssetUrl';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const layoutWidth = useAppLayoutWidth();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const { user, showCompanyPrice, setShowCompanyPrice } = useAuthStore();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addToCart } = useAddToCart();
  const [adding, setAdding] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id!),
    enabled: !!id,
  });

  const { data: related } = useQuery({
    queryKey: ['products', 'related', product?.categoryId],
    queryFn: () => productsApi.getAll({ categoryId: product!.categoryId!, limit: 4 }),
    enabled: !!product?.categoryId,
  });

  const isCompany = user?.role === 'company' && user.companyProfile?.status === 'approved';
  const useCompanyPrice = isCompany && showCompanyPrice && product?.companyPrice !== null;
  const price = useCompanyPrice ? product?.companyPrice : product?.normalPrice;
  const originalPrice = useCompanyPrice ? product?.normalPrice : undefined;
  const wishlisted = product ? isWishlisted(product.id) : false;

  const handleAddToCart = async (event?: GestureResponderEvent, openCart = false) => {
    if (!product) return;
    const priceType = useCompanyPrice ? 'company' : 'normal';
    setAdding(true);
    try {
      const added = await addToCart(product, quantity, priceType, event ? {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      } : undefined);
      if (added && openCart) router.push('/(tabs)/cart');
    } finally {
      setAdding(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  if (isLoading || !product) {
    return (
      <View style={styles.loading}>
        <TouchableOpacity
          style={styles.backBtnInline}
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <LoadingSkeleton height={300} />
        <LoadingSkeleton height={24} style={{ marginTop: spacing.md }} />
        <LoadingSkeleton height={16} width="50%" style={{ marginTop: spacing.sm }} />
      </View>
    );
  }

  const images = product.images?.length
    ? product.images.map((i) => resolveApiAssetUrl(i.imageUrl))
    : [resolveApiAssetUrl(product.imageUrl)];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View>
        <HorizontalNavRow step={layoutWidth} alwaysShow enabled={images.length > 1}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const width = event.nativeEvent.layoutMeasurement.width || layoutWidth;
              if (!width) return;
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setActiveImage(Math.max(0, Math.min(index, images.length - 1)));
            }}
            onMomentumScrollEnd={(event) => {
              const width = event.nativeEvent.layoutMeasurement.width || layoutWidth;
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setActiveImage(Math.max(0, Math.min(index, images.length - 1)));
            }}
          >
            {images.map((uri, i) => (
              <View key={i} style={[styles.heroFrame, { width: layoutWidth }]}>
                <Image
                  source={{ uri }}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        </HorizontalNavRow>
        {images.length > 1 ? (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
            ))}
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={() => toggleWishlist(product.id, product)}
          hitSlop={8}
        >
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={22}
            color={wishlisted ? colors.danger : colors.mutedText}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
        <Text style={styles.title}>{product.name}</Text>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color={colors.warning} />
          <Text style={styles.rating}>
            {product.ratingAverage.toFixed(1)} ({product.ratingCount} reviews)
          </Text>
        </View>

        {isCompany && product.companyPrice !== null && (
          <CompanyPriceToggle showCompanyPrice={showCompanyPrice} onToggle={setShowCompanyPrice} />
        )}

        <PriceDisplay
          price={price || 0}
          originalPrice={originalPrice}
          size="lg"
          showCompanyBadge={useCompanyPrice}
        />

        <Badge
          label={product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
          variant={product.stockQuantity > 0 ? 'success' : 'danger'}
        />

        <View style={styles.qtySection}>
          <Text style={styles.qtyLabel}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
              <Ionicons name="remove" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.qty}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton
            title="Add to Cart"
            onPress={(event) => handleAddToCart(event)}
            loading={adding}
            style={{ flex: 1 }}
            disabled={product.stockQuantity === 0}
          />
          <AppButton
            title="Buy Now"
            variant="secondary"
            onPress={(event) => handleAddToCart(event, true)}
            style={{ flex: 1 }}
            disabled={product.stockQuantity === 0 || adding}
          />
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{product.description}</Text>

        {related?.data && related.data.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Related Products</Text>
            <HorizontalNavRow step={240}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {related.data
                  .filter((p) => p.id !== product.id)
                  .map((p) => (
                    <View key={p.id} style={{ marginRight: spacing.sm }}>
                      <ProductCard product={p} onPress={() => router.push(`/product/${p.id}`)} />
                    </View>
                  ))}
              </ScrollView>
            </HorizontalNavRow>
          </>
        )}
        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { padding: spacing.md },
  backBtn: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 10,
    zIndex: 3,
    ...shadows.sm,
  },
  backBtnInline: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 10,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  heroFrame: {
    height: 360,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: { width: '100%', height: '100%' },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(31, 31, 31, 0.25)',
  },
  dotActive: { backgroundColor: colors.primary, width: 16 },
  wishlistBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 10,
    zIndex: 3,
    ...shadows.sm,
  },
  content: { padding: spacing.md },
  bottomSpacer: { height: spacing.tabBarOffset + spacing.xl },
  brand: { ...typography.caption, color: colors.mutedText, textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  rating: { ...typography.bodySmall, color: colors.mutedText },
  qtySection: { marginTop: spacing.lg },
  qtyLabel: { ...typography.bodySmall, color: colors.mutedText, marginBottom: spacing.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  qty: { ...typography.h3, minWidth: 30, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  description: { ...typography.body, color: colors.mutedText, lineHeight: 24 },
});
