import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../theme';

export function LoadingSkeleton({ width, height, style }: { width?: number | string; height?: number; style?: object }) {
  return <View style={[styles.skeleton, { width: width || '100%', height: height || 16 }, style]} />;
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <LoadingSkeleton height={140} style={styles.image} />
      <LoadingSkeleton height={14} style={{ marginTop: spacing.sm }} />
      <LoadingSkeleton height={12} width="60%" style={{ marginTop: spacing.xs }} />
      <LoadingSkeleton height={16} width="40%" style={{ marginTop: spacing.sm }} />
    </View>
  );
}

export function HomeLoadingSkeleton() {
  return (
    <View style={styles.home}>
      <LoadingSkeleton height={48} style={{ marginBottom: spacing.md }} />
      <LoadingSkeleton height={120} style={{ marginBottom: spacing.md, borderRadius: borderRadius.lg }} />
      <View style={styles.row}>
        {[1, 2, 3, 4].map((i) => (
          <LoadingSkeleton key={i} width={72} height={72} style={{ borderRadius: borderRadius.md }} />
        ))}
      </View>
      <View style={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: colors.border, borderRadius: borderRadius.sm },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    margin: spacing.xs,
    ...shadows.sm,
  },
  image: { borderRadius: borderRadius.md },
  home: { padding: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
