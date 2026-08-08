import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import type { Order } from '@doublea/shared';
import { OrderCard, ScreenContainer, EmptyState } from '@/components';
import { useInfiniteQuery } from '@tanstack/react-query';
import { deliveryApi } from '@/services/endpoints';
import { colors, spacing, typography } from '@/theme';

export default function DeliveryCompletedScreen() {
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['delivery-orders-completed'],
    queryFn: ({ pageParam }) => deliveryApi.getCompletedOrders(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
  const orders = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Completed deliveries</Text>
        <Text style={styles.subtitle}>
          {total === 0 ? 'No completed deliveries yet' : `${total} delivered orders`}
        </Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, orders.length === 0 && styles.listEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
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
              icon="checkmark-done-outline"
              title="No completed deliveries yet"
              subtitle="Delivered orders will appear here. Pull down to refresh."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => router.push(`/delivery-order/${item.id}`)}
            showCustomer
            useDriverStatusLabel
          />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.mutedText, marginTop: 4 },
  list: { padding: spacing.md, paddingBottom: spacing.xxl + 80 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
});
