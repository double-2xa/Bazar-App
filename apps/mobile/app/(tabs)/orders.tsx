import { FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { ordersApi } from '@/services/endpoints';
import { useAuthStore } from '@/store/authStore';
import { OrderCard, EmptyState, AppButton } from '@/components';

export default function OrdersScreen() {
  const { isAuthenticated } = useAuthStore();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.getMyOrders,
    enabled: isAuthenticated,
  });

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
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="No orders yet" subtitle="Your order history will appear here" />
        }
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => router.push(`/order/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, flexGrow: 1 },
});
