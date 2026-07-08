import { ScrollView, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, typography } from '@/theme';
import { deliveryApi } from '@/services/endpoints';
import { OrderCard } from '@/components';

export default function DeliveryCompletedScreen() {
  const { data } = useQuery({ queryKey: ['delivery-orders'], queryFn: deliveryApi.getOrders });
  const orders = data?.delivered || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Completed Deliveries ({orders.length})</Text>
      {orders.map((order: { id: string }) => (
        <OrderCard key={order.id} order={order as never} onPress={() => {}} showCustomer />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.md },
});
