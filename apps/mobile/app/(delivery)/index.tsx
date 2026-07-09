import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { deliveryApi } from '@/services/endpoints';
import { OrderCard, EmptyState, ScreenContainer, GlassCard } from '@/components';
import { colors, spacing, typography } from '@/theme';

const STATUS_SECTIONS = [
  { key: 'assigned', label: 'Assigned', icon: 'clipboard-outline' as const },
  { key: 'picked_up', label: 'Picked up', icon: 'cube-outline' as const },
  { key: 'on_the_way', label: 'On the way', icon: 'navigate-outline' as const },
] as const;

export default function DeliveryDashboardScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: deliveryApi.getOrders,
    refetchInterval: 30000,
  });

  const activeCount =
    (data?.assigned?.length ?? 0) +
    (data?.picked_up?.length ?? 0) +
    (data?.on_the_way?.length ?? 0);

  return (
    <ScreenContainer scroll={false} edges={['top']}>
      <GlassCard style={styles.hero} dark>
        <Text style={styles.heroEyebrow}>Driver console</Text>
        <Text style={styles.heroTitle}>Active routes</Text>
        <Text style={styles.heroSubtitle}>{activeCount} deliveries in progress</Text>
      </GlassCard>

      {isLoading ? (
        <Text style={styles.loading}>Loading orders...</Text>
      ) : (
        <FlatList
          data={STATUS_SECTIONS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          ListEmptyComponent={null}
          renderItem={({ item: section }) => {
            const orders = data?.[section.key] || [];
            if (orders.length === 0) return null;
            return (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name={section.icon} size={18} color={colors.mapAccent} />
                  <Text style={styles.sectionTitle}>
                    {section.label} ({orders.length})
                  </Text>
                </View>
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
          }}
          ListFooterComponent={
            !isLoading && activeCount === 0 ? (
              <EmptyState
                icon="bicycle-outline"
                title="No active deliveries"
                subtitle="New assignments will appear here automatically"
              />
            ) : null
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  heroEyebrow: { ...typography.caption, color: colors.primaryLight },
  heroTitle: { ...typography.h2, color: colors.surface, marginTop: 4 },
  heroSubtitle: { ...typography.bodySmall, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  loading: { ...typography.body, color: colors.mutedText, textAlign: 'center', marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl + 80 },
  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text },
});
