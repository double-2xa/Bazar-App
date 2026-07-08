import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, Platform, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryApi } from '@/services/endpoints';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { AppButton, AppInput, Badge, DeliveryMap } from '@/components';

export default function DeliveryOrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [deliveredToName, setDeliveredToName] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['delivery-order', id],
    queryFn: () => deliveryApi.getOrder(id!),
    enabled: !!id,
  });

  const pickedUpMutation = useMutation({
    mutationFn: () => deliveryApi.markPickedUp(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delivery-orders'] }),
  });

  const onTheWayMutation = useMutation({
    mutationFn: () => deliveryApi.markOnTheWay(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delivery-orders'] }),
  });

  const deliveredMutation = useMutation({
    mutationFn: () => deliveryApi.markDelivered(id!, { deliveredToName, deliveryNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      router.replace({ pathname: '/delivery-completed', params: { orderNumber: order?.orderNumber } });
    },
  });

  const openMaps = () => {
    const lat = order?.address?.latitude;
    const lng = order?.address?.longitude;
    if (!lat || !lng) {
      Alert.alert('No coordinates', 'Address coordinates not available');
      return;
    }
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}`,
    });
    if (url) Linking.openURL(url);
  };

  if (isLoading || !order) {
    return <View style={styles.loading}><Text>Loading...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Badge label={order.status.replace(/_/g, ' ')} variant="primary" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Customer</Text>
        <Text style={styles.text}>{order.user?.fullName}</Text>
        <Text style={styles.muted}>{order.user?.phone}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery Address</Text>
        <Text style={styles.text}>{order.address?.street}</Text>
        <Text style={styles.muted}>{order.address?.city}, {order.address?.postalCode}</Text>
        <AppButton title="Open in Maps" variant="outline" onPress={openMaps} style={{ marginTop: spacing.sm }} size="sm" />
      </View>

      {order.address?.latitude && order.address?.longitude && (
        <DeliveryMap
          style={styles.map}
          latitude={order.address.latitude}
          longitude={order.address.longitude}
        />
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items ({order.items?.length})</Text>
        {order.items?.map((item: { id: string; productName: string; quantity: number; unitPrice: number }) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.text}>{item.productName} x{item.quantity}</Text>
            <Text style={styles.text}>${(item.unitPrice * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${order.totalAmount.toFixed(2)}</Text>
        </View>
        <Text style={styles.muted}>Payment: {order.paymentMethod.replace(/_/g, ' ')} · {order.paymentStatus}</Text>
      </View>

      {order.customerNote && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Note</Text>
          <Text style={styles.muted}>{order.customerNote}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {order.status === 'assigned' && (
          <AppButton title="Mark as Picked Up" onPress={() => pickedUpMutation.mutate()} loading={pickedUpMutation.isPending} fullWidth />
        )}
        {order.status === 'picked_up' && (
          <AppButton title="Mark as On The Way" onPress={() => onTheWayMutation.mutate()} loading={onTheWayMutation.isPending} fullWidth />
        )}
        {(order.status === 'picked_up' || order.status === 'on_the_way') && (
          <>
            <AppInput label="Delivered To (optional)" value={deliveredToName} onChangeText={setDeliveredToName} />
            <AppInput label="Delivery Note (optional)" value={deliveryNote} onChangeText={setDeliveryNote} multiline />
            <AppButton title="Mark as Delivered" variant="secondary" onPress={() => deliveredMutation.mutate()} loading={deliveredMutation.isPending} fullWidth />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  orderNumber: { ...typography.h3, color: colors.text },
  card: { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, ...shadows.sm },
  cardTitle: { ...typography.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.bodySmall, color: colors.mutedText, marginTop: 2 },
  map: { height: 200, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: borderRadius.lg },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  totalLabel: { ...typography.body, fontWeight: '600' },
  totalValue: { ...typography.h3, color: colors.primary },
  actions: { padding: spacing.md, gap: spacing.sm },
});
