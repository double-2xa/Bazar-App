import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from './GlassView';
import { colors, spacing, typography, radius } from '@/theme';

interface GlassHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  floating?: boolean;
}

export function GlassHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  children,
  style,
  floating = false,
}: GlassHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[floating && styles.floating, { paddingTop: floating ? insets.top + spacing.sm : 0 }, style]}>
      <GlassView style={styles.container}>
        <View style={styles.row}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.iconBtn}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconSpacer} />
          )}
          <View style={styles.titles}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.right}>{rightAction ?? <View style={styles.iconSpacer} />}</View>
        </View>
        {children}
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  container: {
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  iconSpacer: { width: 36 },
  titles: { flex: 1 },
  title: { ...typography.h3, color: colors.text },
  subtitle: { ...typography.caption, color: colors.mutedText, marginTop: 2 },
  right: { minWidth: 36, alignItems: 'flex-end' },
});
