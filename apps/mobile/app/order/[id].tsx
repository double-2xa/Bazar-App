import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl, Linking, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { OrderStatus } from '@doublea/shared';
import { colors, spacing, typography } from '@/theme';
import { ordersApi } from '@/services/endpoints';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/services/getErrorMessage';
import {
  canCustomerCancelOrder,
  formatCustomerOrderStatus,
  formatCustomerPaymentMethod,
  formatCustomerPaymentStatus,
  getCustomerStatusVariant,
  getPaymentStatusVariant,
  LIVE_TRACKING_UNAVAILABLE_MESSAGE,
  shouldShowLiveTrackingMessage,
} from '@/utils/customerOrder';
import {
  AppButton,
  Badge,
  DeliveryMap,
  EmptyState,
  GlassCard,
  OrderStatusStepper,
  OrderTimeline,
  SignatureImage,
} from '@/components';

function formatAddressLine(order: {
  address?: {
    street?: string;
    building?: string | null;
    city?: string;
    district?: string | null;
    governorate?: string | null;
    country?: string;
    fullName?: string;
    phone?: string;
  };
}) {
  if (!order.address) return '';
  const { street, building, city, district, governorate, country } = order.address;
  const line1 = [street, building].filter(Boolean).join(', ');
  const line2 = [city, district, governorate, country].filter(Boolean).join(', ');
  return [line1, line2].filter(Boolean).join('\n');
}

export default function OrderDetailsScreen() {
  const { isAuthenticated } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);

  const { data: order, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['order', isAuthenticated ? 'account' : 'guest', id],
    queryFn: () => isAuthenticated ? ordersApi.getById(id!) : ordersApi.getGuestById(id!),
    enabled: !!id,
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      if (id) refetch();
    }, [id, refetch]),
  );

  const cancelMutation = useMutation({
    mutationFn: () => isAuthenticated ? ordersApi.cancel(id!) : ordersApi.cancelGuest(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      Alert.alert('Cancelled', 'Your order has been cancelled.');
    },
    onError: (err) => Alert.alert('Error', getErrorMessage(err)),
  });

  const confirmCancel = () => {
    Alert.alert('Cancel order', 'Are you sure you want to cancel this order?', [
      { text: 'Keep order', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  };

  const openMaps = () => {
    const lat = order?.address?.latitude;
    const lng = order?.address?.longitude;
    const addressQuery = formatAddressLine(order ?? {});
    const query = lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(addressQuery);
    if (!query) return;

    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    if (url) Linking.openURL(url);
  };

  const callDriver = () => {
    const phone = order?.deliveryAgent?.phone;
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const downloadInvoice = async () => {
    if (!id || Platform.OS !== 'web') return;
    setInvoiceDownloading(true);
    try {
      const invoice = await ordersApi.downloadInvoice(id);
      const url = URL.createObjectURL(invoice);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order?.orderNumber ?? id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      Alert.alert('Invoice unavailable', getErrorMessage(err));
    } finally {
      setInvoiceDownloading(false);
    }
  };

  if (isLoading || !order) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  const hasCoordinates = order.address?.latitude != null && order.address?.longitude != null;
  const showTrackingNotice = shouldShowLiveTrackingMessage(order.status as OrderStatus);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Badge
            label={formatCustomerOrderStatus(order.status)}
            variant={getCustomerStatusVariant(order.status)}
          />
        </View>
        <Text style={styles.placedAt}>
          Placed{' '}
          {new Date(order.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </GlassCard>

      {Platform.OS === 'web' ? (
        <AppButton
          title="Download invoice"
          variant="outline"
          onPress={downloadInvoice}
          loading={invoiceDownloading}
          style={styles.invoiceButton}
          fullWidth
        />
      ) : null}

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Delivery progress</Text>
        <OrderStatusStepper status={order.status as OrderStatus} />
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Delivery</Text>

        {order.deliveryAgent ? (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Driver</Text>
            <Text style={styles.infoValue}>{order.deliveryAgent.fullName}</Text>
            {order.deliveryAgent.phone ? (
              <AppButton
                title={`Call ${order.deliveryAgent.phone}`}
                variant="outline"
                size="sm"
                onPress={callDriver}
                style={styles.inlineAction}
              />
            ) : null}
          </View>
        ) : (
          <Text style={styles.muted}>
            {order.status === 'pending' || order.status === 'confirmed'
              ? 'A driver will be assigned once your order is confirmed.'
              : 'Driver details will appear when assigned.'}
          </Text>
        )}

        {order.address ? (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{formatAddressLine(order)}</Text>
            {order.address.fullName ? (
              <Text style={styles.muted}>
                {order.address.fullName}
                {order.address.phone ? ` · ${order.address.phone}` : ''}
              </Text>
            ) : null}
            <AppButton
              title="Open in Maps"
              variant="outline"
              size="sm"
              onPress={openMaps}
              style={styles.inlineAction}
            />
          </View>
        ) : null}

        {hasCoordinates ? (
          <View style={styles.mapWrap}>
            <DeliveryMap
              latitude={order.address!.latitude!}
              longitude={order.address!.longitude!}
              markers={[
                {
                  id: order.id,
                  latitude: order.address!.latitude!,
                  longitude: order.address!.longitude!,
                  title: 'Delivery address',
                  description: order.address?.city,
                  pinColor: colors.primary,
                },
              ]}
              style={styles.map}
            />
            <Text style={styles.mapCaption}>Delivery address pin — not live driver tracking.</Text>
          </View>
        ) : null}

        {showTrackingNotice && (
          <View style={styles.trackingNotice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            <Text style={styles.trackingText}>{LIVE_TRACKING_UNAVAILABLE_MESSAGE}</Text>
          </View>
        )}

        {/* TODO: Live driver map tracking when driver status is on_the_way (post-MVP). */}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Payment</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Method</Text>
          <Text style={styles.infoValue}>{formatCustomerPaymentMethod(order.paymentMethod)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Status</Text>
          <Badge
            label={formatCustomerPaymentStatus(order.paymentStatus)}
            variant={getPaymentStatusVariant(order.paymentStatus)}
          />
        </View>
        {order.paymentMethod === 'cash_on_delivery' && order.paymentStatus === 'unpaid' && (
          <Text style={styles.muted}>Pay ${order.totalAmount.toFixed(2)} when your order arrives.</Text>
        )}
        {order.paymentMethod === 'wish_money' && order.paymentStatus === 'unpaid' && (
          <Text style={styles.muted}>
            Send ${order.totalAmount.toFixed(2)} via Wish Money to the shop. Payment status updates when an admin confirms it.
          </Text>
        )}
        {order.paymentMethod === 'wish_money' && order.paymentStatus === 'paid' && (
          <Text style={styles.muted}>Wish Money payment confirmed by the shop.</Text>
        )}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Items</Text>
        {order.items?.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.productName} x{item.quantity}</Text>
              {item.unavailableQuantity > 0 ? (
                <Text style={styles.unavailableItem}>
                  {item.unavailableQuantity} unavailable · not charged
                </Text>
              ) : null}
            </View>
            <Text style={styles.itemPrice}>${item.totalPrice.toFixed(2)}</Text>
          </View>
        ))}
      </GlassCard>

      <GlassCard style={styles.card}>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Subtotal</Text>
          <Text>${order.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Delivery</Text>
          <Text>${order.deliveryFee.toFixed(2)}</Text>
        </View>
        {order.discountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Discount</Text>
            <Text>-${order.discountAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Tax</Text>
          <Text>${order.taxAmount.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${order.totalAmount.toFixed(2)}</Text>
        </View>
      </GlassCard>

      {order.statusHistory && order.statusHistory.length > 0 && (
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>Order timeline</Text>
          <OrderTimeline entries={order.statusHistory} />
        </GlassCard>
      )}

      {order.status === 'delivered' && order.deliveryProof && (
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>Delivery confirmation</Text>
          <Text style={styles.muted}>
            Delivered{' '}
            {new Date(order.deliveryProof.deliveredAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {order.deliveryProof.deliveredToName ? (
            <Text style={styles.infoValue}>Received by: {order.deliveryProof.deliveredToName}</Text>
          ) : null}
          {order.deliveryProof.deliveryNote ? (
            <Text style={styles.muted}>{order.deliveryProof.deliveryNote}</Text>
          ) : null}
          {order.deliveryProof.clientSignatureDataUrl ? (
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>Customer signature</Text>
              <SignatureImage uri={order.deliveryProof.clientSignatureDataUrl} />
            </View>
          ) : null}
        </GlassCard>
      )}

      {canCustomerCancelOrder(order.status as OrderStatus) && (
        <AppButton
          title="Cancel order"
          variant="danger"
          onPress={confirmCancel}
          loading={cancelMutation.isPending}
          style={styles.cancelButton}
          fullWidth
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.mutedText },
  card: { marginBottom: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { ...typography.h3, color: colors.text },
  placedAt: { ...typography.bodySmall, color: colors.mutedText, marginTop: spacing.xs },
  cardTitle: { ...typography.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  infoBlock: { marginBottom: spacing.sm },
  infoLabel: { ...typography.caption, color: colors.mutedText, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { ...typography.body, color: colors.text, marginTop: 2 },
  muted: { ...typography.bodySmall, color: colors.mutedText, marginTop: 2 },
  inlineAction: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  mapWrap: { marginTop: spacing.sm },
  map: { height: 180 },
  mapCaption: { ...typography.caption, color: colors.mutedText, marginTop: spacing.xs, fontStyle: 'italic' },
  trackingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.info + '15',
    borderRadius: 8,
  },
  trackingText: { ...typography.bodySmall, color: colors.text, flex: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  itemDetails: { flex: 1 },
  itemName: { ...typography.bodySmall, color: colors.text },
  unavailableItem: { ...typography.caption, color: colors.danger, fontWeight: '600' },
  itemPrice: { ...typography.bodySmall, color: colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel: { ...typography.body, fontWeight: '600', color: colors.text },
  totalValue: { ...typography.h3, color: colors.primary },
  cancelButton: { marginTop: spacing.sm },
  invoiceButton: { marginBottom: spacing.sm },
  sigBlock: { marginTop: spacing.md },
  sigLabel: { ...typography.caption, color: colors.mutedText, marginBottom: 4, fontWeight: '600' },
});
