import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { deliveryApi } from '@/services/endpoints';
import { DeliveryMap, EmptyState, FloatingActionBar } from '@/components';
import { colors, spacing, typography } from '@/theme';
import type { MapMarker } from '@/types/map';
export default function DeliveryMapScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: deliveryApi.getOrders,
    refetchInterval: 30000,
  });

  const activeOrders = [
    ...(data?.assigned || []),
    ...(data?.picked_up || []),
    ...(data?.on_the_way || []),
  ];

  const markers: MapMarker[] = activeOrders
    .filter((order: { address?: { latitude?: number; longitude?: number } }) =>
      order.address?.latitude && order.address?.longitude,
    )
    .map((order: {
      id: string;
      orderNumber: string;
      status: string;
      address: { latitude: number; longitude: number; city?: string };
    }) => ({
      id: order.id,
      latitude: order.address.latitude,
      longitude: order.address.longitude,
      title: order.orderNumber,
      description: `${order.status.replace(/_/g, ' ')} · ${order.address.city ?? 'Delivery'}`,
      pinColor: colors.primary,
    }));

  const hasMarkers = markers.length > 0;
  const center = hasMarkers
    ? { latitude: markers[0].latitude, longitude: markers[0].longitude }
    : { latitude: 52.3676, longitude: 4.9041 };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <Text style={styles.loading}>Loading delivery map...</Text>
        </View>
      ) : hasMarkers ? (
        <DeliveryMap latitude={center.latitude} longitude={center.longitude} markers={markers} style={styles.map} />
      ) : (
        <View style={styles.centered}>
          <EmptyState
            icon="map-outline"
            title="No active deliveries on map"
            subtitle="Assigned routes with saved coordinates will appear here"
          />
        </View>
      )}

      <FloatingActionBar avoidTabBar>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Active deliveries</Text>
          <Text style={styles.sheetSubtitle}>
            {hasMarkers
              ? `${markers.length} stop${markers.length === 1 ? '' : 's'} with geo coordinates`
              : 'Waiting for assigned orders with location data'}
          </Text>
          {activeOrders.slice(0, 3).map((order: { id: string; orderNumber: string }) => (
            <Text
              key={order.id}
              style={styles.orderLink}
              onPress={() => router.push(`/delivery-order/${order.id}`)}
            >
              Open {order.orderNumber}
            </Text>
          ))}
        </View>
      </FloatingActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  loading: { ...typography.body, color: colors.mutedText },
  sheetTitle: { ...typography.h3, color: colors.text },
  sheetSubtitle: { ...typography.bodySmall, color: colors.mutedText, marginTop: 4 },
  sheet: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  orderLink: { ...typography.bodySmall, color: colors.primary, fontWeight: '600', marginTop: spacing.sm },
});
