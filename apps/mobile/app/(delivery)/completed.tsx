import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { deliveryApi } from '@/services/endpoints';
import { OrderCard, ScreenContainer } from '@/components';
import { colors, spacing, typography } from '@/theme';

export default function DeliveryCompletedScreen() {
  const { data } = useQuery({ queryKey: ['delivery-orders'], queryFn: deliveryApi.getOrders });
  const orders = data?.delivered || [];

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Completed deliveries</Text>
        <Text style={styles.subtitle}>{orders.length} delivered orders</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item: { id: string }) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: { id: string } }) => (
          <OrderCard
            order={item as never}
            onPress={() => router.push(`/delivery-order/${item.id}`)}
            showCustomer
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
});
