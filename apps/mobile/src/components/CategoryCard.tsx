import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { Category } from '@doublea/shared';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
}

export function CategoryCard({ category, onPress }: CategoryCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image
        source={{ uri: category.imageUrl || '' }}
        style={styles.image}
        resizeMode="cover"
      />
      <Text style={styles.name} numberOfLines={1}>
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
  image: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  name: { ...typography.caption, color: colors.text, textAlign: 'center', fontWeight: '500' },
});
