import { View, Text, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useDeliveryOrders } from '@/hooks/useDeliveryOrders';
import { DeliveryMap, EmptyState, FloatingActionBar } from '@/components';
import { colors, spacing, typography } from '@/theme';
import type { MapMarker } from '@/types/map';
import type { Order } from '@doublea/shared';

export default function DeliveryMapScreen() {
  const { data, isLoading, isRefetching, refetch } = useDeliveryOrders();

  const activeOrders: Order[] = [
    ...(data?.assigned ?? []),
    ...(data?.accepted ?? []),
    ...(data?.picked_up ?? []),
    ...(data?.on_the_way ?? []),
  ];

  const markers: MapMarker[] = activeOrders
    .filter((order) => order.address?.latitude != null && order.address?.longitude != null)
    .map((order) => ({
      id: order.id,
      latitude: order.address!.latitude!,
      longitude: order.address!.longitude!,
      title: order.orderNumber,
      description: `${order.status.replace(/_/g, ' ')} · ${order.address?.city ?? 'Delivery'}`,
      pinColor: colors.primary,
    }));

  const hasMarkers = markers.length > 0;
  const center = hasMarkers
    ? { latitude: markers[0].latitude, longitude: markers[0].longitude }
    : { latitude: 33.8547, longitude: 35.8623 };

  return (
    <View style={styles.container}>
      {isLoading && !data ? (
        <View style={styles.centered}>
          <Text style={styles.loading}>Loading delivery map...</Text>
        </View>
      ) : hasMarkers ? (
        <DeliveryMap
          latitude={center.latitude}
          longitude={center.longitude}
          markers={markers}
          style={styles.map}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <EmptyState
            icon="map-outline"
            title="No map locations available yet."
            subtitle={
              activeOrders.length > 0
                ? `${activeOrders.length} active ${activeOrders.length === 1 ? 'order' : 'orders'} without saved coordinates. Open an order for the address and use external navigation.`
                : 'Assigned deliveries with saved coordinates will appear as pins here.'
            }
          />
        </ScrollView>
      )}

      <FloatingActionBar avoidTabBar>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Active deliveries</Text>
          <Text style={styles.sheetSubtitle}>
            {hasMarkers
              ? `${markers.length} stop${markers.length === 1 ? '' : 's'} with geo coordinates`
              : activeOrders.length > 0
                ? `${activeOrders.length} active without map pins`
                : 'No active assignments'}
          </Text>
          {activeOrders.slice(0, 3).map((order) => (
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
  centered: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
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
