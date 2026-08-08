import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, glass, radius } from '@/theme';

export function GlassTabBarBackground() {
  if (glass.useBlur) {
    return (
      <BlurView
        intensity={glass.blurIntensity}
        tint={glass.tint}
        style={[StyleSheet.absoluteFill, styles.bg]}
      />
    );
  }

  return null;
}

export const glassTabBarStyle = {
  position: 'absolute' as const,
  bottom: Platform.OS === 'ios' ? 24 : 12,
  left: 16,
  right: 16,
  height: 64,
  borderRadius: glass.tabBarRadius,
  backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.tabBarBgAndroid,
  borderTopWidth: 0,
  elevation: 0,
  paddingBottom: Platform.OS === 'ios' ? 8 : 6,
  paddingTop: 8,
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    web: {
      bottom: 12,
      // Keep the floating bar inside the web phone frame
      boxShadow: '0 8px 24px rgba(31, 31, 31, 0.14)',
    } as object,
  }),
};

const styles = StyleSheet.create({
  bg: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: glass.borderWidth,
    borderColor: glass.border,
  },
});
