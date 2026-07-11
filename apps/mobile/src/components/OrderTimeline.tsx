import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OrderStatusHistoryEntry } from '@doublea/shared';
import { colors, spacing, typography } from '@/theme';
import { formatCustomerOrderStatus } from '@/utils/customerOrder';

interface OrderTimelineProps {
  entries: OrderStatusHistoryEntry[];
}

export function OrderTimeline({ entries }: OrderTimelineProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <View style={styles.container}>
      {sorted.map((entry, index) => {
        const isLatest = index === 0;
        return (
          <View key={`${entry.status}-${entry.createdAt}-${index}`} style={styles.row}>
            <View style={styles.left}>
              <View style={[styles.dot, isLatest && styles.dotLatest]}>
                {isLatest ? (
                  <Ionicons name="radio-button-on" size={10} color={colors.surface} />
                ) : (
                  <Ionicons name="checkmark" size={10} color={colors.surface} />
                )}
              </View>
              {index < sorted.length - 1 && <View style={styles.line} />}
            </View>
            <View style={styles.content}>
              <Text style={[styles.status, isLatest && styles.statusLatest]}>
                {formatCustomerOrderStatus(entry.status)}
              </Text>
              <Text style={styles.time}>
                {new Date(entry.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.xs },
  row: { flexDirection: 'row', minHeight: 56 },
  left: { alignItems: 'center', width: 28 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLatest: { backgroundColor: colors.primary },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  content: { flex: 1, paddingLeft: spacing.sm, paddingBottom: spacing.sm },
  status: { ...typography.bodySmall, fontWeight: '600', color: colors.text },
  statusLatest: { color: colors.primary },
  time: { ...typography.caption, color: colors.mutedText, marginTop: 2 },
  note: { ...typography.caption, color: colors.mutedText, marginTop: 4, fontStyle: 'italic' },
});
