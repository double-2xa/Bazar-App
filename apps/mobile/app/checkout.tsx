import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_DELIVERY_FEE, DEFAULT_TAX_RATE } from '@doublea/shared';
import { colors, spacing, radius, typography } from '@/theme';
import { cartApi, addressesApi, ordersApi } from '@/services/endpoints';
import { AppButton, AppInput, GlassCard, FloatingActionBar, ScreenContainer } from '@/components';
import { useAuthStore } from '@/store/authStore';
import { hapticSuccess } from '@/utils/haptics';

export default function CheckoutScreen() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/(auth)/login');
  }, [isAuthenticated]);

  const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: cartApi.get, enabled: isAuthenticated });
  const { data: addresses } = useQuery({ queryKey: ['addresses'], queryFn: addressesApi.getAll, enabled: isAuthenticated });

  useEffect(() => {
    if (addresses?.length && !selectedAddress) {
      setSelectedAddress(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, selectedAddress]);

  const items = cart?.items || [];
  const subtotal = items.reduce(
    (sum: number, item: { product: { normalPrice: number; companyPrice: number }; selectedPriceType: string; quantity: number }) => {
      const price = item.selectedPriceType === 'company' ? item.product.companyPrice : item.product.normalPrice;
      return sum + price * item.quantity;
    },
    0,
  );
  const deliveryFee = DEFAULT_DELIVERY_FEE;
  const taxAmount = subtotal * DEFAULT_TAX_RATE;
  const total = subtotal + deliveryFee + taxAmount;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) return;
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
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      await hapticSuccess();
      router.replace({
        pathname: '/order-confirmation',
        params: { orderNumber: order.orderNumber, total: order.totalAmount.toString() },
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to place order';
      Alert.alert('Checkout', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <ScreenContainer bottomInset={180}>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.subtitle}>Review delivery and payment</Text>

        <Text style={styles.sectionTitle}>Delivery address</Text>
        {addresses?.map((addr) => (
          <TouchableOpacity
            key={addr.id}
            onPress={() => setSelectedAddress(addr.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedAddress === addr.id }}
          >
            <GlassCard style={[styles.addressCard, selectedAddress === addr.id && styles.addressSelected]}>
              <View style={styles.addressRow}>
                <Ionicons
                  name={selectedAddress === addr.id ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={colors.primary}
                />
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>{addr.label}</Text>
                  <Text style={styles.addressText}>{addr.fullName} · {addr.phone}</Text>
                  <Text style={styles.addressText}>{addr.street}, {addr.city}</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
        <AppButton title="Add New Address" variant="outline" onPress={() => router.push('/add-address')} />

        <Text style={styles.sectionTitle}>Payment</Text>
        <GlassCard style={styles.paymentCard}>
          <Ionicons name="cash-outline" size={24} color={colors.primary} />
          <View>
            <Text style={styles.paymentTitle}>Cash on Delivery</Text>
            <Text style={styles.paymentDesc}>Pay when your order arrives</Text>
          </View>
        </GlassCard>

        <AppInput label="Promo code" value={couponCode} onChangeText={setCouponCode} placeholder="Enter code" />
        <AppInput label="Order note (optional)" value={note} onChangeText={setNote} placeholder="Delivery instructions..." multiline />

        <Text style={styles.sectionTitle}>Summary</Text>
        <GlassCard>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text>${subtotal.toFixed(2)}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery</Text><Text>${deliveryFee.toFixed(2)}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tax</Text><Text>${taxAmount.toFixed(2)}</Text></View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </GlassCard>
      </ScreenContainer>

      <FloatingActionBar>
        <AppButton title="Place Order" onPress={handlePlaceOrder} loading={loading} fullWidth size="lg" disabled={!selectedAddress || items.length === 0} />
      </FloatingActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.mutedText, marginBottom: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  addressCard: { marginBottom: spacing.sm },
  addressSelected: { borderWidth: 1.5, borderColor: colors.primary },
  addressRow: { flexDirection: 'row', gap: spacing.md },
  addressInfo: { flex: 1 },
  addressLabel: { ...typography.body, fontWeight: '600', color: colors.text },
  addressText: { ...typography.bodySmall, color: colors.mutedText },
  paymentCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  paymentTitle: { ...typography.body, fontWeight: '600', color: colors.text },
  paymentDesc: { ...typography.bodySmall, color: colors.mutedText },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { ...typography.body, color: colors.mutedText },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel: { ...typography.h3, color: colors.text },
  totalValue: { ...typography.h3, color: colors.primary },
});
