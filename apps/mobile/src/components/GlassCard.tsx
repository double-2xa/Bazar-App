import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { GlassView } from './GlassView';
import { spacing } from '@/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  dark?: boolean;
}

export function GlassCard({ children, style, padded = true, dark = false }: GlassCardProps) {
  return (
    <GlassView style={[padded && styles.padded, style]} dark={dark}>
      {children}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  padded: {
    padding: spacing.md,
  },
});
