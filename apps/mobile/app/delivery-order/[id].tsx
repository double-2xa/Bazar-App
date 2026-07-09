import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { deliveryApi } from '@/services/endpoints';
import { colors, spacing, radius, typography } from '@/theme';
import { AppButton, AppInput, Badge, DeliveryMap, FloatingActionBar, GlassCard } from '@/components';

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

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    queryClient.invalidateQueries({ queryKey: ['delivery-order', id] });
  };

  const pickedUpMutation = useMutation({
    mutationFn: () => deliveryApi.markPickedUp(id!),
    onSuccess: invalidateOrder,
  });

  const onTheWayMutation = useMutation({
    mutationFn: () => deliveryApi.markOnTheWay(id!),
    onSuccess: invalidateOrder,
  });

  const deliveredMutation = useMutation({
    mutationFn: () => deliveryApi.markDelivered(id!, { deliveredToName, deliveryNote }),
    onSuccess: () => {
      invalidateOrder();
      router.replace({ pathname: '/delivery-completed', params: { orderNumber: order?.orderNumber } });
    },
  });

  const openMaps = () => {
    const lat = order?.address?.latitude;
    const lng = order?.address?.longitude;
    if (!lat || !lng) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}`,
    });
    if (url) Linking.openURL(url);
  };

  if (isLoading || !order) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading delivery...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {order.address?.latitude && order.address?.longitude ? (
        <DeliveryMap
          style={styles.map}
          latitude={order.address.latitude}
          longitude={order.address.longitude}
          markers={[
            {
              id: order.id,
              latitude: order.address.latitude,
              longitude: order.address.longitude,
              title: order.orderNumber,
              description: order.address.city,
              pinColor: colors.primary,
            },
          ]}
        />
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard>
          <View style={styles.headerRow}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Badge label={order.status.replace(/_/g, ' ')} variant="primary" />
          </View>
          <Text style={styles.muted}>Customer: {order.user?.fullName}</Text>
          <Text style={styles.muted}>{order.address?.street}, {order.address?.city}</Text>
          <AppButton
            title="Navigate in Maps"
            variant="outline"
            onPress={openMaps}
            style={{ marginTop: spacing.sm }}
            size="sm"
          />
        </GlassCard>

        <GlassCard style={styles.cardGap}>
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
        </GlassCard>

        {(order.status === 'picked_up' || order.status === 'on_the_way') && (
          <GlassCard style={styles.cardGap}>
            <AppInput label="Delivered to (optional)" value={deliveredToName} onChangeText={setDeliveredToName} />
            <AppInput label="Delivery note (optional)" value={deliveryNote} onChangeText={setDeliveryNote} multiline />
          </GlassCard>
        )}
      </ScrollView>

      <FloatingActionBar>
        {order.status === 'assigned' && (
          <AppButton title="Mark as Picked Up" onPress={() => pickedUpMutation.mutate()} loading={pickedUpMutation.isPending} fullWidth />
        )}
        {order.status === 'picked_up' && (
          <AppButton title="Mark as On The Way" onPress={() => onTheWayMutation.mutate()} loading={onTheWayMutation.isPending} fullWidth />
        )}
        {(order.status === 'picked_up' || order.status === 'on_the_way') && (
          <AppButton
            title="Mark as Delivered"
            variant="secondary"
            onPress={() => deliveredMutation.mutate()}
            loading={deliveredMutation.isPending}
            fullWidth
          />
        )}
        {order.status === 'delivered' && (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.doneText}>Delivery completed</Text>
          </View>
        )}
      </FloatingActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.mutedText },
  map: { height: 240, margin: spacing.md, marginBottom: 0 },
  content: { padding: spacing.md, paddingBottom: 160 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { ...typography.h3, color: colors.text },
  cardGap: { marginTop: spacing.sm },
  cardTitle: { ...typography.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.bodySmall, color: colors.mutedText, marginTop: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  totalLabel: { ...typography.body, fontWeight: '600' },
  totalValue: { ...typography.h3, color: colors.primary },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  doneText: { ...typography.body, color: colors.success, fontWeight: '600' },
});
