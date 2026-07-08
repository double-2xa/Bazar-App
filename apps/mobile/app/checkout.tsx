import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_DELIVERY_FEE, DEFAULT_TAX_RATE } from '@doublea/shared';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { cartApi, addressesApi, ordersApi } from '@/services/endpoints';
import { AppButton, AppInput } from '@/components';

export default function CheckoutScreen() {
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: cartApi.get });
  const { data: addresses } = useQuery({ queryKey: ['addresses'], queryFn: addressesApi.getAll });

  const items = cart?.items || [];
  const subtotal = items.reduce((sum: number, item: { product: { normalPrice: number; companyPrice: number }; selectedPriceType: string; quantity: number }) => {
    const price = item.selectedPriceType === 'company' ? item.product.companyPrice : item.product.normalPrice;
    return sum + price * item.quantity;
  }, 0);
  const deliveryFee = DEFAULT_DELIVERY_FEE;
  const taxAmount = subtotal * DEFAULT_TAX_RATE;
  const total = subtotal + deliveryFee + taxAmount;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address');
      return;
    }
    setLoading(true);
    try {
      const order = await ordersApi.create({
        addressId: selectedAddress,
        paymentMethod: 'cash_on_delivery',
        customerNote: note || undefined,
        couponCode: couponCode || undefined,
        items: items.map((item: { productId: string; quantity: number; selectedPriceType: string }) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedPriceType: item.selectedPriceType,
        })),
      });
      router.replace({ pathname: '/order-confirmation', params: { orderNumber: order.orderNumber, total: order.totalAmount.toString() } });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to place order';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {addresses?.map((addr) => (
          <TouchableOpacity
            key={addr.id}
            style={[styles.addressCard, selectedAddress === addr.id && styles.addressSelected]}
            onPress={() => setSelectedAddress(addr.id)}
          >
            <Ionicons name={selectedAddress === addr.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.primary} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>{addr.label}</Text>
              <Text style={styles.addressText}>{addr.fullName} · {addr.phone}</Text>
              <Text style={styles.addressText}>{addr.street}, {addr.city}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <AppButton title="Add New Address" variant="outline" onPress={() => router.push('/add-address')} style={{ marginBottom: spacing.lg }} />

        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentCard}>
          <Ionicons name="cash-outline" size={24} color={colors.primary} />
          <View>
            <Text style={styles.paymentTitle}>Cash on Delivery</Text>
            <Text style={styles.paymentDesc}>Pay when your order arrives</Text>
          </View>
        </View>

        <AppInput label="Promo Code" value={couponCode} onChangeText={setCouponCode} placeholder="Enter code" />
        <AppInput label="Order Note (optional)" value={note} onChangeText={setNote} placeholder="Delivery instructions..." multiline />

        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summary}>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text>${subtotal.toFixed(2)}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery</Text><Text>${deliveryFee.toFixed(2)}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tax</Text><Text>${taxAmount.toFixed(2)}</Text></View>
          <View style={[styles.summaryRow, styles.totalRow]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>${total.toFixed(2)}</Text></View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton title="Place Order" onPress={handlePlaceOrder} loading={loading} fullWidth size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  addressSelected: { borderColor: colors.primary },
  addressInfo: { flex: 1 },
  addressLabel: { ...typography.body, fontWeight: '600', color: colors.text },
  addressText: { ...typography.bodySmall, color: colors.mutedText },
  paymentCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  paymentTitle: { ...typography.body, fontWeight: '600', color: colors.text },
  paymentDesc: { ...typography.bodySmall, color: colors.mutedText },
  summary: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, ...shadows.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { ...typography.body, color: colors.mutedText },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel: { ...typography.h3, color: colors.text },
  totalValue: { ...typography.h3, color: colors.primary },
  footer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
