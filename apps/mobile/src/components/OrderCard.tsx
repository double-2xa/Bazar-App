import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Order } from '@doublea/shared';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';
import { Badge } from './Badge';

const STATUS_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  assigned: 'info',
  picked_up: 'primary',
  on_the_way: 'primary',
  delivered: 'success',
  cancelled: 'danger',
};

interface OrderCardProps {
  order: Order & { itemCount?: number };
  onPress: () => void;
  showCustomer?: boolean;
}

export function OrderCard({ order, onPress, showCustomer }: OrderCardProps) {
  const variant = STATUS_VARIANT[order.status] || 'primary';
  const itemCount = order.itemCount || order.items?.length || 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Badge label={order.status.replace(/_/g, ' ')} variant={variant} />
      </View>
      {showCustomer && order.user && (
        <Text style={styles.customer}>{order.user.fullName}</Text>
      )}
      {order.address && (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={colors.mutedText} />
          <Text style={styles.address} numberOfLines={1}>
            {order.address.street}, {order.address.city}
          </Text>
        </View>
      )}
      <View style={styles.footer}>
        <Text style={styles.items}>{itemCount} items</Text>
        <Text style={styles.total}>${order.totalAmount.toFixed(2)}</Text>
      </View>
      <Text style={styles.date}>
        {new Date(order.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { ...typography.body, fontWeight: '600', color: colors.text },
  customer: { ...typography.bodySmall, color: colors.text, marginTop: spacing.xs },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  address: { ...typography.bodySmall, color: colors.mutedText, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  items: { ...typography.bodySmall, color: colors.mutedText },
  total: { ...typography.body, fontWeight: '700', color: colors.primary },
  date: { ...typography.caption, color: colors.mutedText, marginTop: spacing.xs },
});
