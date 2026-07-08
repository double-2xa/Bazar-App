import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/theme';
import { deliveryApi } from '@/services/endpoints';
import { OrderCard, EmptyState } from '@/components';

const STATUS_SECTIONS = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'on_the_way', label: 'On The Way' },
  { key: 'delivered', label: 'Delivered' },
] as const;

export default function DeliveryDashboardScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: deliveryApi.getOrders,
    refetchInterval: 30000,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery Dashboard</Text>
        <Text style={styles.headerSubtitle}>Your assigned orders</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <Text style={styles.loading}>Loading orders...</Text>
        ) : (
          STATUS_SECTIONS.map(({ key, label }) => {
            const orders = data?.[key] || [];
            if (orders.length === 0) return null;
            return (
              <View key={key}>
                <Text style={styles.sectionTitle}>{label} ({orders.length})</Text>
                {orders.map((order: { id: string }) => (
                  <OrderCard
                    key={order.id}
                    order={order as never}
                    onPress={() => router.push(`/delivery-order/${order.id}`)}
                    showCustomer
                  />
                ))}
              </View>
            );
          })
        )}
        {!isLoading && !data?.assigned?.length && !data?.picked_up?.length && !data?.on_the_way?.length && (
          <EmptyState icon="bicycle-outline" title="No active deliveries" subtitle="New assignments will appear here" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.secondary, padding: spacing.lg },
  headerTitle: { ...typography.h2, color: colors.surface },
  headerSubtitle: { ...typography.bodySmall, color: colors.primaryLight, marginTop: 4 },
  content: { padding: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  loading: { ...typography.body, color: colors.mutedText, textAlign: 'center', marginTop: spacing.xl },
});
