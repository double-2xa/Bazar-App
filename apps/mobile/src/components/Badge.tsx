import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'company' | 'deal';
}

export function Badge({ label, variant = 'primary' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  primary: { backgroundColor: colors.primaryLight + '33' },
  success: { backgroundColor: colors.success + '22' },
  warning: { backgroundColor: colors.warning + '22' },
  danger: { backgroundColor: colors.danger + '22' },
  info: { backgroundColor: colors.info + '22' },
  company: { backgroundColor: colors.companyBadge },
  deal: { backgroundColor: colors.dealBadgeBg },
  text: { ...typography.caption, fontWeight: '600' },
  text_primary: { color: colors.primaryDark },
  text_success: { color: colors.success },
  text_warning: { color: colors.warning },
  text_danger: { color: colors.danger },
  text_info: { color: colors.info },
  text_company: { color: colors.warmCream },
  text_deal: { color: colors.dealBadgeText },
});
