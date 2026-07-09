import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from './GlassView';
import { spacing, radius } from '@/theme';

interface FloatingActionBarProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Lift above the floating glass tab bar on tab screens */
  avoidTabBar?: boolean;
}

export function FloatingActionBar({ children, style, avoidTabBar = false }: FloatingActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, spacing.md), bottom: avoidTabBar ? spacing.tabBarOffset : 0 },
        style,
      ]}
    >
      <GlassView style={styles.bar} intensity={80}>
        <View style={styles.content}>{children}</View>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
  },
  bar: {
    borderRadius: radius.xl,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
});
