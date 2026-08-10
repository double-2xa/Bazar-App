import { useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_TAX_RATE, CUSTOMER_PAYMENT_METHOD_LABELS } from '@doublea/shared';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { cartApi, addressesApi, ordersApi } from '@/services/endpoints';
import { getErrorMessage } from '@/services/getErrorMessage';
import { AppButton, AppInput } from '@/components';

WebBrowser.maybeCompleteAuthSession();

const CHECKOUT_PAYMENT_OPTIONS: {
  id: 'cash_on_delivery' | 'wish_money';
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: 'cash_on_delivery',
    title: CUSTOMER_PAYMENT_METHOD_LABELS.cash_on_delivery,
    description: 'Pay when your order arrives',
    icon: 'cash-outline',
  },
  {
    id: 'wish_money',
    title: CUSTOMER_PAYMENT_METHOD_LABELS.wish_money,
    description: 'Pay securely in the Wish Money app',
    icon: 'phone-portrait-outline',
  },
];

export default function CheckoutScreen() {
  const queryClient = useQueryClient();
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'wish_money'>('cash_on_delivery');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const idempotencyKey = useRef(Crypto.randomUUID());

  const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: cartApi.get });
  const { data: addresses } = useQuery({ queryKey: ['addresses'], queryFn: addressesApi.getAll });

  useEffect(() => {
    if (!selectedAddress && addresses?.length) {
      const preferred = addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedAddress(preferred.id);
    }
  }, [addresses, selectedAddress]);

  const { data: deliveryQuote, isFetching: quoteLoading } = useQuery({
    queryKey: ['delivery-quote', selectedAddress],
    queryFn: () => ordersApi.getDeliveryQuote(selectedAddress!),
    enabled: !!selectedAddress,
  });

  const items = cart?.items || [];
  const subtotal = items.reduce((sum: number, item: { product: { normalPrice: number; companyPrice: number }; selectedPriceType: string; quantity: number }) => {
    const price = item.selectedPriceType === 'company' ? item.product.companyPrice : item.product.normalPrice;
    return sum + price * item.quantity;
  }, 0);
  const deliveryFee = deliveryQuote?.deliveryFee ?? 0;
  const taxAmount = subtotal * DEFAULT_TAX_RATE;
  const total = subtotal + deliveryFee + taxAmount;
  const checkoutSignature = JSON.stringify({ selectedAddress, couponCode, note, items: items.map((item: { productId: string; quantity: number; selectedPriceType: string }) => [item.productId, item.quantity, item.selectedPriceType]) });

  useEffect(() => {
    idempotencyKey.current = Crypto.randomUUID();
  }, [checkoutSignature]);

  const goToConfirmation = async (orderNumber: string, orderTotal: number) => {
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    router.replace({
      pathname: '/order-confirmation',
      params: {
        orderNumber,
        total: String(orderTotal ?? 0),
      },
    });
  };

  const completeWishPayment = async (orderId: string, orderNumber: string, orderTotal: number) => {
    const verified = await ordersApi.verifyWhishPayment(orderId);
    if (verified.paymentStatus === 'paid' || verified.collectStatus === 'success') {
      await goToConfirmation(orderNumber, orderTotal);
      return;
    }
    Alert.alert(
      'Payment not completed',
      'Your Wish Money payment was not confirmed. You can open the order and try verifying again after paying.',
    );
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address');
      return;
    }
    setLoading(true);
    try {
      const order = await ordersApi.create({
        addressId: selectedAddress,
        paymentMethod,
        customerNote: note || undefined,
        items: items.map((item: { productId: string; quantity: number; selectedPriceType: string }) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedPriceType: item.selectedPriceType,
        })),
      });

      if (paymentMethod === 'wish_money') {
        if (!order.collectUrl) {
          throw new Error('Wish Money payment URL was not returned');
        }
        const returnUrl = Linking.createURL('whish-return');
        const result = await WebBrowser.openAuthSessionAsync(order.collectUrl, returnUrl);
        if (result.type === 'success' || result.type === 'dismiss') {
          await completeWishPayment(order.id, order.orderNumber, order.totalAmount ?? 0);
        } else {
          Alert.alert(
            'Payment cancelled',
            'Wish Money checkout was closed before payment finished. Your cart is still available.',
          );
        }
        return;
      }

      await goToConfirmation(order.orderNumber, order.totalAmount ?? 0);
      }, idempotencyKey.current);
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace({
        pathname: '/order-confirmation',
        params: {
          orderNumber: order.orderNumber,
          total: String(order.totalAmount ?? 0),
        },
      });
    } catch (err: unknown) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to place order'));
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
        {CHECKOUT_PAYMENT_OPTIONS.map((option) => {
          const selected = paymentMethod === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.paymentCard, selected && styles.paymentSelected]}
              onPress={() => setPaymentMethod(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={colors.primary}
              />
              <Ionicons name={option.icon} size={24} color={colors.primary} />
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentTitle}>{option.title}</Text>
                <Text style={styles.paymentDesc}>{option.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {paymentMethod === 'wish_money' ? (
          <Text style={styles.wishHint}>
            You will be redirected to Wish Money to pay. After payment you return to the app and checkout completes automatically.
          </Text>
        ) : null}

        <AppInput label="Order Note (optional)" value={note} onChangeText={setNote} placeholder="Delivery instructions..." multiline />

        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summary}>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text>${subtotal.toFixed(2)}</Text></View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text>
              {quoteLoading && selectedAddress
                ? '…'
                : selectedAddress
                  ? `$${deliveryFee.toFixed(2)}`
                  : 'Select address'}
            </Text>
          </View>
          {deliveryQuote?.distanceKm != null ? (
            <Text style={styles.distanceHint}>
              ~{deliveryQuote.distanceKm.toFixed(1)} km
              {deliveryQuote.placeName ? ` · ${deliveryQuote.placeName}` : ''}
            </Text>
          ) : null}
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tax</Text><Text>${taxAmount.toFixed(2)}</Text></View>
          <View style={[styles.summaryRow, styles.totalRow]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>${total.toFixed(2)}</Text></View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          title={paymentMethod === 'wish_money' ? 'Pay with Wish Money' : 'Place Order'}
          onPress={handlePlaceOrder}
          loading={loading}
          fullWidth
          size="lg"
        />
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
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  paymentSelected: { borderColor: colors.primary },
  paymentInfo: { flex: 1 },
  paymentTitle: { ...typography.body, fontWeight: '600', color: colors.text },
  paymentDesc: { ...typography.bodySmall, color: colors.mutedText },
  wishHint: {
    ...typography.bodySmall,
    color: colors.mutedText,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  summary: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, ...shadows.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { ...typography.body, color: colors.mutedText },
  distanceHint: { ...typography.caption, color: colors.mutedText, marginBottom: spacing.sm },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel: { ...typography.h3, color: colors.text },
  totalValue: { ...typography.h3, color: colors.primary },
  footer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
