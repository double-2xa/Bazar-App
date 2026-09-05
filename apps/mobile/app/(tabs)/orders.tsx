import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
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

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['orders', isAuthenticated ? 'account' : 'guest'],
    queryFn: ({ pageParam }) => isAuthenticated
      ? ordersApi.getMyOrders(pageParam, 20)
      : ordersApi.getGuestOrders(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 0,
  });
  const orders = data?.pages.flatMap((page) => page.data) ?? [];

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [isAuthenticated, refetch]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
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
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="receipt-outline"
              title="No orders yet"
              subtitle={isAuthenticated
                ? 'Your order history will appear here. Pull down to refresh after placing an order.'
                : 'Guest orders placed on this device will appear here.'}
              action={!isAuthenticated ? <AppButton title="Sign In" variant="outline" onPress={() => router.push('/(auth)/login')} /> : undefined}
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
