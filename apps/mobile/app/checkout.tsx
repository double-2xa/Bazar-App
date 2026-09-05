import { useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_TAX_RATE, CUSTOMER_PAYMENT_METHOD_LABELS } from '@doublea/shared';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { cartApi, addressesApi, ordersApi } from '@/services/endpoints';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/services/getErrorMessage';
import { AppButton, AppInput } from '@/components';

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
    description: 'Pay via Wish Money — shop confirms after transfer',
    icon: 'phone-portrait-outline',
  },
];

export default function CheckoutScreen() {
  const { isAuthenticated, guestCart, clearGuestCart } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'wish_money'>('cash_on_delivery');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [guest, setGuest] = useState({
    fullName: '', phone: '', email: '', district: '', city: '', street: '',
    building: '', floor: '', apartment: '', latitude: undefined as number | undefined,
    longitude: undefined as number | undefined, locationAccuracyM: undefined as number | undefined,
  });
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [locating, setLocating] = useState(false);
  const idempotencyKey = useRef(Crypto.randomUUID());

  const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: cartApi.get, enabled: isAuthenticated });
  const { data: addresses } = useQuery({ queryKey: ['addresses'], queryFn: addressesApi.getAll, enabled: isAuthenticated });

  useEffect(() => {
    if (!selectedAddress && addresses?.length) {
      const preferred = addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedAddress(preferred.id);
    }
  }, [addresses, selectedAddress]);

  const { data: deliveryQuote, isFetching: quoteLoading } = useQuery({
    queryKey: ['delivery-quote', selectedAddress],
    queryFn: () => ordersApi.getDeliveryQuote(selectedAddress!),
    enabled: isAuthenticated && !!selectedAddress,
  });

  const { data: guestDeliveryQuote, isFetching: guestQuoteLoading } = useQuery({
    queryKey: ['guest-delivery-quote', guest.city, guest.latitude, guest.longitude],
    queryFn: () => ordersApi.getGuestDeliveryQuote({ city: guest.city, latitude: guest.latitude, longitude: guest.longitude }),
    enabled: !isAuthenticated && guest.city.trim().length > 1,
  });

  const items = isAuthenticated ? cart?.items || [] : guestCart;
  const subtotal = items.reduce((sum: number, item: { product: { normalPrice: number; companyPrice: number }; selectedPriceType: string; quantity: number }) => {
    const price = isAuthenticated && item.selectedPriceType === 'company' ? item.product.companyPrice : item.product.normalPrice;
    return sum + price * item.quantity;
  }, 0);
  const activeQuote = isAuthenticated ? deliveryQuote : guestDeliveryQuote;
  const deliveryFee = activeQuote?.deliveryFee ?? 0;
  const taxAmount = subtotal * DEFAULT_TAX_RATE;
  const total = subtotal + deliveryFee + taxAmount;
  const checkoutSignature = JSON.stringify({
    selectedAddress, guest,
    note,
    paymentMethod,
    items: items.map((item: { productId: string; quantity: number; selectedPriceType: string }) => [
      item.productId,
      item.quantity,
      item.selectedPriceType,
    ]),
  });

  useEffect(() => {
    idempotencyKey.current = Crypto.randomUUID();
  }, [checkoutSignature]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Basket Empty', 'Please add at least one product.');
      return;
    }
    if (isAuthenticated && !selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address');
      return;
    }
    if (!isAuthenticated) {
      const required = [guest.fullName, guest.phone, guest.district, guest.city, guest.street];
      if (required.some((value) => !value.trim())) {
        Alert.alert('Details Required', 'Please fill in your name, WhatsApp number, district, city/town and street/landmark.');
        return;
      }
      const digits = guest.phone.replace(/\D/g, '');
      if (!(digits.startsWith('961') || digits.startsWith('00961') || digits.startsWith('0')) || digits.length < 7) {
        Alert.alert('Phone Number', 'Enter a valid Lebanese phone or WhatsApp number.');
        return;
      }
    }
    setLoading(true);
    try {
      const order = isAuthenticated ? await ordersApi.create(
        {
          addressId: selectedAddress,
          paymentMethod,
          customerNote: note || undefined,
          items: items.map((item: { productId: string; quantity: number; selectedPriceType: string }) => ({
            productId: item.productId,
            quantity: item.quantity,
            selectedPriceType: item.selectedPriceType,
          })),
        },
        idempotencyKey.current,
      ) : await ordersApi.createGuest({
        address: {
          fullName: guest.fullName, phone: guest.phone, district: guest.district,
          city: guest.city, street: guest.street, building: guest.building || undefined,
          floor: guest.floor || undefined, apartment: guest.apartment || undefined,
          latitude: guest.latitude, longitude: guest.longitude,
          locationAccuracyM: guest.locationAccuracyM,
        },
        email: guest.email || undefined,
        whatsappOptIn,
        paymentMethod,
        customerNote: note || undefined,
        items: items.map((item: { productId: string; quantity: number }) => ({
          productId: item.productId, quantity: item.quantity, selectedPriceType: 'normal',
        })),
      }, idempotencyKey.current);

      if (isAuthenticated) await queryClient.invalidateQueries({ queryKey: ['cart'] });
      else clearGuestCart();
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

  const captureLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location Permission', 'Location is optional. You can continue with the written address.');
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGuest((current) => ({
        ...current,
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        locationAccuracyM: result.coords.accuracy ?? undefined,
      }));
    } catch {
      Alert.alert('Location', 'Could not capture your location. You can continue without it.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {isAuthenticated ? addresses?.map((addr) => (
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
        )) : (
          <View style={styles.guestForm}>
            <Text style={styles.guestIntro}>Checkout as guest. Enter delivery details for this order.</Text>
            <AppInput label="Full name *" value={guest.fullName} onChangeText={(fullName) => setGuest((v) => ({ ...v, fullName }))} />
            <AppInput label="Lebanese phone / WhatsApp *" value={guest.phone} onChangeText={(phone) => setGuest((v) => ({ ...v, phone }))} keyboardType="phone-pad" placeholder="03 123 456 or +961…" />
            <AppInput label="Email (optional)" value={guest.email} onChangeText={(email) => setGuest((v) => ({ ...v, email }))} keyboardType="email-address" autoCapitalize="none" />
            <AppInput label="District *" value={guest.district} onChangeText={(district) => setGuest((v) => ({ ...v, district }))} />
            <AppInput label="City / town *" value={guest.city} onChangeText={(city) => setGuest((v) => ({ ...v, city }))} />
            <AppInput label="Street / landmark *" value={guest.street} onChangeText={(street) => setGuest((v) => ({ ...v, street }))} multiline />
            <AppInput label="Building" value={guest.building} onChangeText={(building) => setGuest((v) => ({ ...v, building }))} />
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}><AppInput label="Floor" value={guest.floor} onChangeText={(floor) => setGuest((v) => ({ ...v, floor }))} /></View>
              <View style={styles.fieldHalf}><AppInput label="Apartment" value={guest.apartment} onChangeText={(apartment) => setGuest((v) => ({ ...v, apartment }))} /></View>
            </View>
            <AppButton title={guest.latitude != null ? 'GPS location added' : 'Add GPS location (optional)'} variant="outline" onPress={captureLocation} loading={locating} />
            <TouchableOpacity style={styles.optInRow} onPress={() => setWhatsappOptIn((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: whatsappOptIn }}>
              <Ionicons name={whatsappOptIn ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
              <Text style={styles.optInText}>Send order and delivery updates to this WhatsApp number (starts after messaging is configured).</Text>
            </TouchableOpacity>
          </View>
        )}
        {isAuthenticated ? <AppButton title="Add New Address" variant="outline" onPress={() => router.push('/add-address')} style={{ marginBottom: spacing.lg }} /> : null}

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
            Place your order, then send the total via Wish Money to the shop. An admin will mark the payment as paid once received.
          </Text>
        ) : null}

        <AppInput label="Order Note (optional)" value={note} onChangeText={setNote} placeholder="Delivery instructions..." multiline />

        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summary}>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text>${subtotal.toFixed(2)}</Text></View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text>
              {(quoteLoading || guestQuoteLoading) && (selectedAddress || guest.city)
                ? '…'
                : (selectedAddress || guest.city)
                  ? `$${deliveryFee.toFixed(2)}`
                  : 'Select address'}
            </Text>
          </View>
          {activeQuote?.distanceKm != null ? (
            <Text style={styles.distanceHint}>
              ~{activeQuote.distanceKm.toFixed(1)} km
              {activeQuote.placeName ? ` · ${activeQuote.placeName}` : ''}
            </Text>
          ) : null}
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tax</Text><Text>${taxAmount.toFixed(2)}</Text></View>
          <View style={[styles.summaryRow, styles.totalRow]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>${total.toFixed(2)}</Text></View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          title="Place Order"
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
  guestForm: { gap: spacing.sm, marginBottom: spacing.lg },
  guestIntro: { ...typography.bodySmall, color: colors.mutedText, marginBottom: spacing.xs },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  fieldHalf: { flex: 1 },
  optInRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  optInText: { ...typography.bodySmall, color: colors.text, flex: 1 },
});
