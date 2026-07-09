import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography, spacing } from '../theme';
import { GlassCard } from './GlassCard';

interface CompanyPriceToggleProps {
  showCompanyPrice: boolean;
  onToggle: (value: boolean) => void;
}

export function CompanyPriceToggle({ showCompanyPrice, onToggle }: CompanyPriceToggleProps) {
  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="briefcase-outline" size={18} color={colors.companyBadge} />
        <Text style={styles.label}>Wholesale pricing</Text>
      </View>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.option, showCompanyPrice && styles.optionActive]}
          onPress={() => onToggle(true)}
          accessibilityRole="button"
          accessibilityState={{ selected: showCompanyPrice }}
        >
          <Text style={[styles.optionText, showCompanyPrice && styles.optionTextActive]}>Company</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, !showCompanyPrice && styles.optionActiveNormal]}
          onPress={() => onToggle(false)}
          accessibilityRole="button"
          accessibilityState={{ selected: !showCompanyPrice }}
        >
          <Text style={[styles.optionText, !showCompanyPrice && styles.optionTextActiveNormal]}>Retail</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  label: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  optionActive: {
    borderColor: colors.companyBadge,
    backgroundColor: colors.companyTint,
  },
  optionActiveNormal: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  optionText: { ...typography.bodySmall, color: colors.mutedText, fontWeight: '500' },
  optionTextActive: { color: colors.companyBadge, fontWeight: '700' },
  optionTextActiveNormal: { color: colors.primaryDark, fontWeight: '700' },
});
