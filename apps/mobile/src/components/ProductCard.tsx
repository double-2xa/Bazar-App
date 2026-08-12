import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@doublea/shared';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';
import { PriceDisplay } from './PriceDisplay';
import { Badge } from './Badge';
import { useAuthStore } from '../store/authStore';
import { useWishlist } from '@/hooks/useWishlist';
import { useProductCardWidth } from '@/layout/webLayout';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: (origin?: { x: number; y: number }) => Promise<boolean> | void;
}

export function ProductCard({ product, onPress, onAddToCart }: ProductCardProps) {
  const cardWidth = useProductCardWidth();
  const { user, showCompanyPrice } = useAuthStore();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);
  const [adding, setAdding] = useState(false);

  const isCompany =
    user?.role === 'company' && user.companyProfile?.status === 'approved' && showCompanyPrice;
  const price = isCompany ? product.companyPrice : product.normalPrice;
  const originalPrice = isCompany ? product.normalPrice : undefined;
  const discount =
    !isCompany && product.companyPrice < product.normalPrice
      ? Math.round((1 - product.companyPrice / product.normalPrice) * 100)
      : 0;

  return (
    <TouchableOpacity style={[styles.card, { width: cardWidth }]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.imageUrl || product.images?.[0]?.imageUrl || '' }}
          style={styles.image}
          resizeMode="cover"
        />
        {discount > 0 && <Badge label={`-${discount}%`} variant="danger" />}
        {isCompany && (
          <View style={styles.companyBadge}>
            <Badge label="Company" variant="company" />
          </View>
        )}
        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={() => toggleWishlist(product.id, product)}
          hitSlop={8}
        >
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={20}
            color={wishlisted ? colors.danger : colors.mutedText}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={colors.warning} />
          <Text style={styles.rating}>
            {product.ratingAverage.toFixed(1)} ({product.ratingCount})
          </Text>
        </View>
        <View style={styles.footer}>
          <PriceDisplay price={price} originalPrice={originalPrice} size="sm" />
          {onAddToCart ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Add ${product.name} to cart`}
              disabled={product.stockQuantity <= 0 || adding}
              style={[
                styles.addButton,
                (product.stockQuantity <= 0 || adding) && styles.addButtonDisabled,
              ]}
              hitSlop={8}
              onPress={async (event: GestureResponderEvent) => {
                event.stopPropagation?.();
                setAdding(true);
                try {
                  await onAddToCart({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
                } finally {
                  setAdding(false);
                }
              }}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="cart-outline" size={17} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    overflow: 'hidden',
  },
  imageContainer: { position: 'relative', height: 140, marginBottom: spacing.md },
  image: { width: '100%', height: '100%', backgroundColor: colors.border },
  companyBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  wishlistBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 6,
    ...shadows.sm,
    zIndex: 1,
  },
  content: { padding: spacing.sm },
  name: { ...typography.bodySmall, color: colors.text, fontWeight: '500', minHeight: 36 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rating: { ...typography.caption, color: colors.mutedText },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.45 },
});
