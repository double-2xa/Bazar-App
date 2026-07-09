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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { productsApi, wishlistApi } from '@/services/endpoints';
import { colors, spacing, radius, typography } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { useAddToCart } from '@/hooks/useAddToCart';
import {
  AppButton,
  PriceDisplay,
  CompanyPriceToggle,
  ProductCard,
  Badge,
  LoadingSkeleton,
  FloatingActionBar,
} from '@/components';
import { hapticSelection } from '@/utils/haptics';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const queryClient = useQueryClient();
  const { user, showCompanyPrice, setShowCompanyPrice, isAuthenticated } = useAuthStore();
  const { addToCart, getPriceType } = useAddToCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id!),
    enabled: !!id,
  });

  const { data: wishlist } = useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistApi.getAll,
    enabled: isAuthenticated,
  });

  const { data: related } = useQuery({
    queryKey: ['products', 'related', product?.categoryId],
    queryFn: () => productsApi.getAll({ categoryId: product!.categoryId, limit: 4 }),
    enabled: !!product?.categoryId,
  });

  const isWishlisted = wishlist?.some((w: { productId: string }) => w.productId === id);

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        router.push('/(auth)/login');
        return;
      }
      if (isWishlisted) {
        await wishlistApi.remove(id!);
      } else {
        await wishlistApi.add(id!);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      hapticSelection();
    },
  });

  const isCompany = user?.role === 'company' && user.companyProfile?.status === 'approved';
  const useCompanyPrice = isCompany && showCompanyPrice;
  const price = useCompanyPrice ? product?.companyPrice : product?.normalPrice;
  const originalPrice = useCompanyPrice ? product?.normalPrice : undefined;

  const handleAddToCart = async () => {
    if (!product) return;
    const ok = await addToCart(product, quantity, getPriceType());
    if (ok) router.push('/(tabs)/cart');
  };

  const handleBuyNow = async () => {
    if (!product) return;
    const ok = await addToCart(product, quantity, getPriceType());
    if (!ok) return;
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    router.push('/checkout');
  };

  if (isLoading || !product) {
    return (
      <View style={styles.loading}>
        <LoadingSkeleton height={320} />
        <LoadingSkeleton height={24} style={{ marginTop: spacing.md }} />
        <LoadingSkeleton height={16} width="50%" style={{ marginTop: spacing.sm }} />
      </View>
    );
  }

  const images = product.images?.length
    ? product.images.map((i) => i.imageUrl)
    : [product.imageUrl || ''];

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {images.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.heroImage} resizeMode="cover" />
          ))}
        </ScrollView>

        <View style={styles.content}>
          {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
          <Text style={styles.title}>{product.name}</Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={colors.warning} />
            <Text style={styles.rating}>
              {product.ratingAverage.toFixed(1)} ({product.ratingCount} reviews)
            </Text>
          </View>

          {isCompany ? (
            <CompanyPriceToggle showCompanyPrice={showCompanyPrice} onToggle={setShowCompanyPrice} />
          ) : null}

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

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {related?.data && related.data.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Related products</Text>
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
          ) : null}
        </View>
      </ScrollView>

      <FloatingActionBar>
        <View style={styles.actionTop}>
          <View>
            <Text style={styles.actionLabel}>Total</Text>
            <PriceDisplay price={(price || 0) * quantity} size="md" showCompanyBadge={useCompanyPrice} />
          </View>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              accessibilityLabel="Decrease quantity"
            >
              <Ionicons name="remove" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.qty}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
              accessibilityLabel="Increase quantity"
            >
              <Ionicons name="add" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.wishBtn}
              onPress={() => wishlistMutation.mutate()}
              accessibilityLabel={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={22}
                color={isWishlisted ? colors.danger : colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <AppButton
            title="Add to Cart"
            onPress={handleAddToCart}
            style={{ flex: 1 }}
            disabled={product.stockQuantity === 0}
          />
          <AppButton
            title="Buy Now"
            variant="secondary"
            onPress={handleBuyNow}
            style={{ flex: 1 }}
            disabled={product.stockQuantity === 0}
          />
        </View>
      </FloatingActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 180 },
  loading: { padding: spacing.md },
  heroImage: { width, height: 340, backgroundColor: colors.border },
  content: { padding: spacing.md },
  brand: { ...typography.caption, color: colors.mutedText, textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  rating: { ...typography.bodySmall, color: colors.mutedText },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  description: { ...typography.body, color: colors.mutedText, lineHeight: 24 },
  actionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionLabel: { ...typography.caption, color: colors.mutedText },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  wishBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
    marginLeft: spacing.xs,
  },
  qty: { ...typography.h3, minWidth: 24, textAlign: 'center' },
  actionButtons: { flexDirection: 'row', gap: spacing.sm },
});
