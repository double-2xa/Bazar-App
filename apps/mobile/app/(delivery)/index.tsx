import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import type { Order, AppNotification } from '@doublea/shared';
import { OrderCard, EmptyState, ScreenContainer, GlassCard, Badge, AppButton } from '@/components';
import { useDeliveryOrders } from '@/hooks/useDeliveryOrders';
import { deliveryApi } from '@/services/endpoints';
import { getErrorMessage } from '@/services/getErrorMessage';
import { DRIVER_SECTIONS, getActiveDeliveryCount, type DriverActiveGroupKey } from '@/utils/deliveryStatus';
import { colors, spacing, typography, radius } from '@/theme';

export default function DeliveryDashboardScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading, isRefetching, refetch } = useDeliveryOrders();
  const [lockingId, setLockingId] = useState<string | null>(null);

  const availableQuery = useQuery({
    queryKey: ['delivery-available'],
    queryFn: deliveryApi.getAvailableOrders,
    refetchInterval: 15000,
  });

  const notificationsQuery = useQuery({
    queryKey: ['delivery-notifications'],
    queryFn: () => deliveryApi.getNotifications(true),
    refetchInterval: 15000,
  });

  useFocusEffect(
    useCallback(() => {
      availableQuery.refetch();
      notificationsQuery.refetch();
    }, [availableQuery.refetch, notificationsQuery.refetch]),
  );

  const activeCount = getActiveDeliveryCount(data);
  const available = availableQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const sectionsWithOrders = DRIVER_SECTIONS.filter(
    (section) => (data?.[section.key as DriverActiveGroupKey]?.length ?? 0) > 0,
  );

  const refreshAll = async () => {
    await Promise.all([
      refetch(),
      availableQuery.refetch(),
      notificationsQuery.refetch(),
    ]);
  };

  const handleLock = (order: Order) => {
    Alert.alert(
      'Lock order',
      `Lock ${order.orderNumber}? Other drivers will no longer be able to take it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock',
          style: 'default',
          onPress: async () => {
            setLockingId(order.id);
            try {
              await deliveryApi.lockOrder(order.id);
              await queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
              await queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
              await queryClient.invalidateQueries({ queryKey: ['delivery-notifications'] });
              router.push(`/delivery-order/${order.id}`);
            } catch (err) {
              Alert.alert('Could not lock', getErrorMessage(err, 'Order may already be taken'));
              await availableQuery.refetch();
            } finally {
              setLockingId(null);
            }
          },
        },
      ],
    );
  };

  const dismissNotification = async (n: AppNotification) => {
    try {
      await deliveryApi.markNotificationRead(n.id);
      await notificationsQuery.refetch();
    } catch {
      /* ignore */
    }
  };

  const listHeader = (
    <>
      <GlassCard style={styles.hero} dark>
        <Text style={styles.heroEyebrow}>Driver console</Text>
        <Text style={styles.heroTitle}>Active routes</Text>
        <Text style={styles.heroSubtitle}>
          {activeCount === 0 ? 'No locked deliveries yet' : `${activeCount} deliveries in progress`}
        </Text>
      </GlassCard>

      {notifications.length > 0 ? (
        <View style={styles.notifyBlock}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>New order alerts</Text>
            <Badge label={String(notifications.length)} variant="warning" />
          </View>
          {notifications.slice(0, 5).map((n) => (
            <TouchableOpacity
              key={n.id}
              style={styles.notifyCard}
              onPress={() => {
                const orderId = n.data?.orderId as string | undefined;
                void dismissNotification(n);
                if (orderId) {
                  const match = available.find((o) => o.id === orderId);
                  if (match) handleLock(match);
                }
              }}
            >
              <Text style={styles.notifyTitle}>{n.title}</Text>
              <Text style={styles.notifyBody}>{n.body}</Text>
              <Text style={styles.notifyAction}>Tap to lock</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="lock-open-outline" size={18} color={colors.mapAccent} />
          <Text style={styles.sectionTitle}>Available to lock</Text>
          <Badge label={String(available.length)} variant="warning" />
        </View>
        {available.length === 0 ? (
          <Text style={styles.emptyHint}>No open orders right now. New placements will notify you here.</Text>
        ) : (
          available.map((order) => (
            <View key={order.id} style={styles.availableCard}>
              <OrderCard
                order={order}
                onPress={() => handleLock(order)}
                showCustomer
                useDriverStatusLabel
              />
              <AppButton
                title={lockingId === order.id ? 'Locking…' : 'Lock order'}
                onPress={() => handleLock(order)}
                loading={lockingId === order.id}
                fullWidth
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ))
        )}
      </View>
    </>
  );

  return (
    <ScreenContainer scroll={false} edges={['top']}>
      {isLoading && !data ? (
        <Text style={styles.loading}>Loading orders...</Text>
      ) : (
        <FlatList
          data={sectionsWithOrders}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.list,
            sectionsWithOrders.length === 0 && available.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || availableQuery.isRefetching}
              onRefresh={refreshAll}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            available.length === 0 ? (
              <EmptyState
                icon="bicycle-outline"
                title="Waiting for orders"
                subtitle="When a customer places an order, you will get a notification to lock it."
              />
            ) : null
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
    marginBottom: spacing.sm,
  },
  heroEyebrow: { ...typography.caption, color: colors.primaryLight },
  heroTitle: { ...typography.h2, color: colors.surface, marginTop: 4 },
  heroSubtitle: { ...typography.bodySmall, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  loading: { ...typography.body, color: colors.mutedText, textAlign: 'center', marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl + 80 },
  listEmpty: { flexGrow: 1 },
  section: { marginBottom: spacing.md },
  notifyBlock: { marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: colors.text, flex: 1 },
  notifyCard: {
    backgroundColor: colors.yellowTint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  notifyTitle: { ...typography.body, fontWeight: '700', color: colors.text },
  notifyBody: { ...typography.bodySmall, color: colors.mutedText, marginTop: 4 },
  notifyAction: { ...typography.caption, color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
  availableCard: { marginBottom: spacing.md },
  emptyHint: { ...typography.bodySmall, color: colors.mutedText, marginBottom: spacing.md },
});
