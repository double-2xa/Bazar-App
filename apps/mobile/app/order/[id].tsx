import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { ordersApi } from '@/services/endpoints';
import { AppButton, Badge } from '@/components';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert('Cancelled', 'Your order has been cancelled');
    },
  });

  if (isLoading || !order) {
    return <View style={styles.loading}><Text>Loading...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Badge label={order.status.replace(/_/g, ' ')} variant={order.status === 'delivered' ? 'success' : 'warning'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items</Text>
        {order.items?.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.productName} x{item.quantity}</Text>
            <Text>${item.totalPrice.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.summaryRow}><Text>Subtotal</Text><Text>${order.subtotal.toFixed(2)}</Text></View>
        <View style={styles.summaryRow}><Text>Delivery</Text><Text>${order.deliveryFee.toFixed(2)}</Text></View>
        <View style={styles.summaryRow}><Text>Tax</Text><Text>${order.taxAmount.toFixed(2)}</Text></View>
        <View style={[styles.summaryRow, styles.totalRow]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>${order.totalAmount.toFixed(2)}</Text></View>
      </View>

      {order.status === 'pending' && (
        <AppButton title="Cancel Order" variant="danger" onPress={() => cancelMutation.mutate()} loading={cancelMutation.isPending} style={{ margin: spacing.md }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  orderNumber: { ...typography.h3 },
  card: { backgroundColor: colors.surface, margin: spacing.md, marginTop: 0, padding: spacing.md, borderRadius: borderRadius.lg, ...shadows.sm },
  cardTitle: { ...typography.body, fontWeight: '600', marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  itemName: { ...typography.bodySmall, flex: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel: { fontWeight: '600' },
  totalValue: { ...typography.h3, color: colors.primary },
});
