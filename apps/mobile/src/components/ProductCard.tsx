import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@doublea/shared';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';
import { PriceDisplay } from './PriceDisplay';
import { Badge } from './Badge';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 3) / 2;

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  onToggleWishlist?: () => void;
  isWishlisted?: boolean;
}

export function ProductCard({
  product,
  onPress,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
}: ProductCardProps) {
  const { user, showCompanyPrice } = useAuthStore();
  const isCompany =
    user?.role === 'company' && user.companyProfile?.status === 'approved' && showCompanyPrice;
  const price = isCompany ? product.companyPrice : product.normalPrice;
  const originalPrice = isCompany ? product.normalPrice : undefined;
  const discount =
    !isCompany && product.companyPrice < product.normalPrice
      ? Math.round((1 - product.companyPrice / product.normalPrice) * 100)
      : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.imageUrl || product.images?.[0]?.imageUrl || '' }}
          style={styles.image}
          resizeMode="cover"
        />
        {discount > 0 && <Badge label={`-${discount}%`} variant="deal" />}
        {isCompany && (
          <View style={styles.companyBadge}>
            <Badge label="Company" variant="company" />
          </View>
        )}
        {onToggleWishlist && (
          <TouchableOpacity style={styles.wishlistBtn} onPress={onToggleWishlist}>
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={20}
              color={isWishlisted ? colors.danger : colors.mutedText}
            />
          </TouchableOpacity>
        )}
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
          {onAddToCart && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={onAddToCart}
              accessibilityLabel="Add to cart"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color={colors.surface} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    overflow: 'hidden',
  },
  imageContainer: { position: 'relative', height: 140 },
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
  },
  content: { padding: spacing.sm },
  name: { ...typography.bodySmall, color: colors.text, fontWeight: '500', minHeight: 36 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rating: { ...typography.caption, color: colors.mutedText },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
