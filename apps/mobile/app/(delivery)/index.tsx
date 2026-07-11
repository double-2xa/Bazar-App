import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Order } from '@doublea/shared';
import { OrderCard, EmptyState, ScreenContainer, GlassCard, Badge } from '@/components';
import { useDeliveryOrders } from '@/hooks/useDeliveryOrders';
import { DRIVER_SECTIONS, getActiveDeliveryCount, type DriverActiveGroupKey } from '@/utils/deliveryStatus';
import { colors, spacing, typography } from '@/theme';

export default function DeliveryDashboardScreen() {
  const { data, isLoading, isRefetching, refetch } = useDeliveryOrders();
  const activeCount = getActiveDeliveryCount(data);
  const sectionsWithOrders = DRIVER_SECTIONS.filter(
    (section) => (data?.[section.key as DriverActiveGroupKey]?.length ?? 0) > 0,
  );

  return (
    <ScreenContainer scroll={false} edges={['top']}>
      <GlassCard style={styles.hero} dark>
        <Text style={styles.heroEyebrow}>Driver console</Text>
        <Text style={styles.heroTitle}>Active routes</Text>
        <Text style={styles.heroSubtitle}>
          {activeCount === 0 ? 'No assigned deliveries yet' : `${activeCount} deliveries in progress`}
        </Text>
      </GlassCard>

      {isLoading && !data ? (
        <Text style={styles.loading}>Loading orders...</Text>
      ) : (
        <FlatList
          data={sectionsWithOrders}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[
            styles.list,
            sectionsWithOrders.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="bicycle-outline"
              title="No assigned deliveries yet."
              subtitle="New assignments from admin will appear here. Pull down to refresh."
            />
          }
          renderItem={({ item: section }) => {
            const orders = (data?.[section.key as DriverActiveGroupKey] ?? []) as Order[];
            return (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name={section.icon} size={18} color={colors.mapAccent} />
                  <Text style={styles.sectionTitle}>{section.label}</Text>
                  <Badge label={String(orders.length)} variant={section.badgeVariant} />
                </View>
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => router.push(`/delivery-order/${order.id}`)}
                    showCustomer
                    useDriverStatusLabel
                  />
                ))}
              </View>
            );
          }}
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
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  section: { marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: colors.text, flex: 1 },
});
