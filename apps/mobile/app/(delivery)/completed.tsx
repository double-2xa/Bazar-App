import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import type { Order } from '@doublea/shared';
import { OrderCard, ScreenContainer, EmptyState } from '@/components';
import { useDeliveryOrders } from '@/hooks/useDeliveryOrders';
import { colors, spacing, typography } from '@/theme';

export default function DeliveryCompletedScreen() {
  const { data, isLoading, isRefetching, refetch } = useDeliveryOrders();
  const orders = (data?.delivered ?? []) as Order[];

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Completed deliveries</Text>
        <Text style={styles.subtitle}>
          {orders.length === 0 ? 'No completed deliveries yet' : `${orders.length} delivered orders`}
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
