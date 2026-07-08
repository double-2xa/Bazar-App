import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';

interface CompanyPriceToggleProps {
  showCompanyPrice: boolean;
  onToggle: (value: boolean) => void;
}

export function CompanyPriceToggle({ showCompanyPrice, onToggle }: CompanyPriceToggleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pricing Mode</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.option, showCompanyPrice && styles.optionActive]}
          onPress={() => onToggle(true)}
        >
          <Text style={[styles.optionText, showCompanyPrice && styles.optionTextActive]}>
            Company Price
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, !showCompanyPrice && styles.optionActive]}
          onPress={() => onToggle(false)}
        >
          <Text style={[styles.optionText, !showCompanyPrice && styles.optionTextActive]}>
            Normal Price
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: spacing.sm },
  label: { ...typography.bodySmall, color: colors.mutedText, marginBottom: spacing.xs },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionActive: { borderColor: colors.companyBadge, backgroundColor: colors.companyBadge + '15' },
  optionText: { ...typography.bodySmall, color: colors.mutedText, fontWeight: '500' },
  optionTextActive: { color: colors.companyBadge, fontWeight: '600' },
});
