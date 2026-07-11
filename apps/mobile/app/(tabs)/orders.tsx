import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Order } from '@doublea/shared';
import { colors, spacing } from '@/theme';
import { ordersApi } from '@/services/endpoints';
import { useAuthStore } from '@/store/authStore';
import { OrderCard, EmptyState, AppButton } from '@/components';

export default function OrdersScreen() {
  const { isAuthenticated } = useAuthStore();

  const { data: orders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.getMyOrders,
    enabled: isAuthenticated,
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) refetch();
    }, [isAuthenticated, refetch]),
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="receipt-outline"
          title="Sign in to view orders"
          subtitle="Track your orders and delivery status"
          action={<AppButton title="Sign In" onPress={() => router.push('/(auth)/login')} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders as Order[] | undefined}
        keyExtractor={(item: Order) => item.id}
        contentContainerStyle={[styles.list, !orders?.length && styles.listEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="receipt-outline"
              title="No orders yet"
              subtitle="Your order history will appear here. Pull down to refresh after placing an order."
            />
          ) : null
        }
        renderItem={({ item }: { item: Order }) => (
          <OrderCard
            order={item}
            onPress={() => router.push(`/order/${item.id}`)}
            showPaymentStatus
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, flexGrow: 1 },
  listEmpty: { justifyContent: 'center' },
});
