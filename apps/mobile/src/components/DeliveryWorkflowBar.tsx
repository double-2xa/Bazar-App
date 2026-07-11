import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';
import { DRIVER_WORKFLOW_STEPS, formatDriverStatus, getWorkflowStepIndex } from '@/utils/deliveryStatus';

interface DeliveryWorkflowBarProps {
  status: string;
}

export function DeliveryWorkflowBar({ status }: DeliveryWorkflowBarProps) {
  const currentIndex = getWorkflowStepIndex(status);
  const isDelivered = status === 'delivered';

  return (
    <View style={styles.container}>
      {DRIVER_WORKFLOW_STEPS.map((step, index) => {
        const done = isDelivered || index < currentIndex;
        const active = !isDelivered && index === currentIndex;
        return (
          <View key={step} style={styles.step}>
            <View
              style={[
                styles.dot,
                done && styles.dotDone,
                active && styles.dotActive,
              ]}
            >
              {done && !active ? (
                <Ionicons name="checkmark" size={10} color={colors.surface} />
              ) : (
                <Text style={[styles.dotNum, active && styles.dotNumActive]}>{index + 1}</Text>
              )}
            </View>
            <Text
              style={[styles.label, active && styles.labelActive, done && styles.labelDone]}
              numberOfLines={1}
            >
              {formatDriverStatus(step)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  step: { flex: 1, alignItems: 'center' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotNum: { ...typography.caption, fontWeight: '700', color: colors.mutedText },
  dotNumActive: { color: colors.surface },
  label: { ...typography.caption, color: colors.mutedText, marginTop: 4, textAlign: 'center' },
  labelActive: { color: colors.primary, fontWeight: '700' },
  labelDone: { color: colors.text },
});
