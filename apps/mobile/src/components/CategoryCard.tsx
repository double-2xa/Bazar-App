import React from 'react';
import { Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { Category } from '@doublea/shared';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';
import { useAppLayoutWidth, useCategoryGridColumns } from '@/layout/webLayout';

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
  /** compact = home strip; grid = Categories tab tiles */
  variant?: 'compact' | 'grid';
}

export function CategoryCard({ category, onPress, variant = 'compact' }: CategoryCardProps) {
  const isGrid = variant === 'grid';
  const layoutWidth = useAppLayoutWidth();
  const columns = useCategoryGridColumns();
  const gridWidth = (layoutWidth - spacing.md * (columns + 1)) / columns;

  return (
    <TouchableOpacity
      style={[styles.card, isGrid && styles.cardGrid, isGrid && { width: gridWidth }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={category.name}
    >
      <Image
        source={{ uri: category.imageUrl || '' }}
        style={[styles.image, isGrid && styles.imageGrid]}
        resizeMode="cover"
      />
      <Text style={[styles.name, isGrid && styles.nameGrid]} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 80,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  cardGrid: {
    marginRight: 0,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  imageGrid: {
    width: '100%',
    height: 110,
    marginBottom: spacing.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  name: { ...typography.caption, color: colors.text, textAlign: 'center', fontWeight: '500' },
  nameGrid: {
    ...typography.bodySmall,
    fontWeight: '600',
    minHeight: 36,
  },
});
