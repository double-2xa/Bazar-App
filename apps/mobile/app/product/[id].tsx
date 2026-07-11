import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
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
} from '@/components';
import { cartApi } from '@/services/endpoints';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const { user, showCompanyPrice, setShowCompanyPrice, isAuthenticated, addToGuestCart } = useAuthStore();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id!),
    enabled: !!id,
  });

  const { data: related } = useQuery({
    queryKey: ['products', 'related', product?.categoryId],
    queryFn: () => productsApi.getAll({ categoryId: product!.categoryId, limit: 4 }),
    enabled: !!product?.categoryId,
  });

  const isCompany = user?.role === 'company' && user.companyProfile?.status === 'approved';
  const useCompanyPrice = isCompany && showCompanyPrice;
  const price = useCompanyPrice ? product?.companyPrice : product?.normalPrice;
  const originalPrice = useCompanyPrice ? product?.normalPrice : undefined;
  const wishlisted = product ? isWishlisted(product.id) : false;

  const handleAddToCart = async () => {
    if (!product) return;
    const priceType = useCompanyPrice ? 'company' : 'normal';
    if (isAuthenticated) {
      await cartApi.addItem(product.id, quantity, priceType);
    } else {
      addToGuestCart(product, quantity, priceType);
    }
    router.push('/(tabs)/cart');
  };

  if (isLoading || !product) {
    return (
      <View style={styles.loading}>
        <LoadingSkeleton height={300} />
        <LoadingSkeleton height={24} style={{ marginTop: spacing.md }} />
        <LoadingSkeleton height={16} width="50%" style={{ marginTop: spacing.sm }} />
      </View>
    );
  }

  const images = product.images?.length
    ? product.images.map((i) => i.imageUrl)
    : [product.imageUrl || ''];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {images.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.heroImage} resizeMode="cover" />
          ))}
        </ScrollView>
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

        {isCompany && (
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
          <AppButton title="Add to Cart" onPress={handleAddToCart} style={{ flex: 1 }} disabled={product.stockQuantity === 0} />
          <AppButton
            title="Buy Now"
            variant="secondary"
            onPress={handleAddToCart}
            style={{ flex: 1 }}
            disabled={product.stockQuantity === 0}
          />
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{product.description}</Text>

        {related?.data && related.data.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Related Products</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {related.data
                .filter((p) => p.id !== product.id)
                .map((p) => (
                  <View key={p.id} style={{ marginRight: spacing.sm }}>
                    <ProductCard product={p} onPress={() => router.push(`/product/${p.id}`)} />
                  </View>
                ))}
            </ScrollView>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { padding: spacing.md },
  heroImage: { width, height: 320, backgroundColor: colors.border },
  wishlistBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 10,
    ...shadows.sm,
  },
  content: { padding: spacing.md },
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
