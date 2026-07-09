import React from 'react';
import { Platform, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, glass, radius, shadows } from '@/theme';

interface GlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  dark?: boolean;
  bordered?: boolean;
}

export function GlassView({
  children,
  style,
  intensity = glass.blurIntensity,
  dark = false,
  bordered = true,
}: GlassViewProps) {
  const borderStyle = bordered
    ? {
        borderWidth: glass.borderWidth,
        borderColor: dark ? colors.glassBorderDark : glass.border,
      }
    : undefined;

  if (glass.useBlur) {
    return (
      <View style={[styles.wrapper, shadows.glass, style]}>
        <BlurView
          intensity={intensity}
          tint={dark ? 'dark' : glass.tint}
          style={[StyleSheet.absoluteFill, borderStyle, styles.blur]}
        />
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: dark ? glass.backgroundDark : glass.background,
        },
        borderStyle,
        shadows.glass,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  blur: {
    borderRadius: radius.lg,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
