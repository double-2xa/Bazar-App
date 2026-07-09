import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  size?: 'sm' | 'md' | 'lg';
  showCompanyBadge?: boolean;
}

export function PriceDisplay({ price, originalPrice, size = 'md', showCompanyBadge }: PriceDisplayProps) {
  const hasDiscount = originalPrice && originalPrice > price;
  const sizeStyles = { sm: styles.sm, md: styles.md, lg: styles.lg };

  return (
    <View style={styles.container}>
      <Text style={[styles.price, sizeStyles[size]]}>${price.toFixed(2)}</Text>
      {hasDiscount && (
        <Text style={[styles.original, sizeStyles[size]]}>${originalPrice!.toFixed(2)}</Text>
      )}
      {showCompanyBadge && <Text style={styles.companyLabel}>Company Price</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  price: { fontWeight: '700', color: colors.primaryDark },
  original: { textDecorationLine: 'line-through', color: colors.mutedText, fontWeight: '400' },
  sm: { fontSize: 13 },
  md: { fontSize: 16 },
  lg: { fontSize: 22 },
  companyLabel: { ...typography.caption, color: colors.companyBadge, fontWeight: '600' },
});
