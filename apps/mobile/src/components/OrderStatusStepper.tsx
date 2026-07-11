import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ORDER_TRACKING_STEPS, CUSTOMER_ORDER_STEP_LABELS } from '@doublea/shared';
import type { OrderStatus } from '@doublea/shared';
import { colors, spacing, typography } from '@/theme';

const STEP_LABELS = CUSTOMER_ORDER_STEP_LABELS;

interface OrderStatusStepperProps {
  status: OrderStatus;
}

export function OrderStatusStepper({ status }: OrderStatusStepperProps) {
  if (status === 'cancelled') {
    return (
      <View style={styles.cancelled}>
        <Ionicons name="close-circle" size={20} color={colors.danger} />
        <Text style={styles.cancelledText}>Order cancelled</Text>
      </View>
    );
  }

  const currentIndex = ORDER_TRACKING_STEPS.indexOf(status as typeof ORDER_TRACKING_STEPS[number]);
  const isDelivered = status === 'delivered';

  return (
    <View style={styles.container}>
      {ORDER_TRACKING_STEPS.map((step, index) => {
        const done = isDelivered || index < currentIndex;
        const active = !isDelivered && index === currentIndex;
        const upcoming = !done && !active;

        return (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepLeft}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                  upcoming && styles.dotUpcoming,
                ]}
              >
                {done && !active ? (
                  <Ionicons name="checkmark" size={12} color={colors.surface} />
                ) : null}
              </View>
              {index < ORDER_TRACKING_STEPS.length - 1 && (
                <View style={[styles.line, (done || active) && styles.lineDone]} />
              )}
            </View>
            <Text
              style={[
                styles.label,
                active && styles.labelActive,
                done && styles.labelDone,
                upcoming && styles.labelUpcoming,
              ]}
            >
              {STEP_LABELS[step]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.xs },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 36 },
  stepLeft: { alignItems: 'center', width: 28 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotUpcoming: { backgroundColor: colors.surface, borderColor: colors.border },
  line: {
    width: 2,
    flex: 1,
    minHeight: 14,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  lineDone: { backgroundColor: colors.success },
  label: { ...typography.bodySmall, color: colors.mutedText, flex: 1, paddingTop: 2, paddingLeft: spacing.sm },
  labelActive: { color: colors.primary, fontWeight: '700' },
  labelDone: { color: colors.text },
  labelUpcoming: { color: colors.mutedText },
  cancelled: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  cancelledText: { ...typography.body, color: colors.danger, fontWeight: '600' },
});
