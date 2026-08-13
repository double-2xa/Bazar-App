import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, Platform, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { deliveryApi } from '@/services/endpoints';
import { getErrorMessage } from '@/services/getErrorMessage';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import { formatDriverStatus } from '@/utils/deliveryStatus';
import { colors, spacing, typography } from '@/theme';
import {
  AppButton,
  AppInput,
  Badge,
  DeliveryMap,
  DeliveryWorkflowBar,
  FloatingActionBar,
  GlassCard,
  SignaturePad,
  SignatureImage,
} from '@/components';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: 'Cash on delivery',
  wish_money: 'Wish Money',
  card: 'Card',
};

const PAYMENT_STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger'> = {
  unpaid: 'warning',
  paid: 'success',
  refunded: 'danger',
};

function formatAddress(order: {
  address?: {
    street?: string | null;
    building?: string | null;
    city?: string | null;
    district?: string | null;
    governorate?: string | null;
    country?: string | null;
  };
}) {
  if (!order.address) return '';
  const { street, building, city, district, governorate, country } = order.address;
  const line1 = [street, building].filter(Boolean).join(', ');
  const line2 = [city, district, governorate, country].filter(Boolean).join(', ');
  return [line1, line2].filter(Boolean).join(' — ');
}

export default function DeliveryOrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [deliveredToName, setDeliveredToName] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [agentSignature, setAgentSignature] = useState<string | null>(null);
  const [clientSignature, setClientSignature] = useState<string | null>(null);

  useRoleGuard({ allowed: 'delivery_agent' });

  const { data: order, isLoading } = useQuery({
    queryKey: ['delivery-order', id],
    queryFn: () => deliveryApi.getOrder(id!),
    enabled: !!id,
  });

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    queryClient.invalidateQueries({ queryKey: ['delivery-available'] });
    queryClient.invalidateQueries({ queryKey: ['delivery-order', id] });
  };

  const acceptMutation = useMutation({
    mutationFn: () => deliveryApi.accept(id!),
    onSuccess: async () => {
      await hapticSuccess();
      invalidateOrder();
    },
    onError: (err) => Alert.alert('Error', getErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => deliveryApi.reject(id!, { reason: rejectReason || undefined }),
    onSuccess: async () => {
      await hapticLight();
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      router.replace('/(delivery)');
    },
    onError: (err) => Alert.alert('Error', getErrorMessage(err)),
  });

  const pickedUpMutation = useMutation({
    mutationFn: () => deliveryApi.markPickedUp(id!),
    onSuccess: async () => {
      await hapticLight();
      invalidateOrder();
    },
    onError: (err) => Alert.alert('Error', getErrorMessage(err)),
  });

  const onTheWayMutation = useMutation({
    mutationFn: () => deliveryApi.markOnTheWay(id!),
    onSuccess: async () => {
      await hapticLight();
      invalidateOrder();
    },
    onError: (err) => Alert.alert('Error', getErrorMessage(err)),
  });

  const deliveredMutation = useMutation({
    mutationFn: () =>
      deliveryApi.markDelivered(id!, {
        deliveredToName: deliveredToName.trim() || undefined,
        deliveryNote: deliveryNote.trim() || undefined,
        agentSignatureDataUrl: agentSignature!,
        clientSignatureDataUrl: clientSignature!,
      }),
    onSuccess: async () => {
      await hapticSuccess();
      invalidateOrder();
      router.replace({ pathname: '/delivery-completed', params: { orderNumber: order?.orderNumber } });
    },
    onError: (err) => Alert.alert('Error', getErrorMessage(err)),
  });

  const confirmDeliver = () => {
    if (!agentSignature || !clientSignature) {
      Alert.alert('Signatures required', 'Both driver and client must sign before completing delivery.');
      return;
    }
    deliveredMutation.mutate();
  };

  const confirmReject = () => {
    Alert.alert(
      'Reject assignment',
      'This order will return to the admin queue for reassignment.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate() },
      ],
    );
  };

  const openMaps = () => {
    const lat = order?.address?.latitude;
    const lng = order?.address?.longitude;
    const addressQuery = formatAddress(order ?? {});
    const query = lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(addressQuery);
    if (!query) return;

    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    if (url) Linking.openURL(url);
  };

  const callCustomer = () => {
    const phone = order?.user?.phone;
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  if (isLoading || !order) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading delivery...</Text>
      </View>
    );
  }

  const hasCoordinates = order.address?.latitude != null && order.address?.longitude != null;
  const canReject = order.status === 'assigned' || order.status === 'accepted';
  const itemCount = order.items?.length ?? 0;
  const isActionPending =
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    pickedUpMutation.isPending ||
    onTheWayMutation.isPending ||
    deliveredMutation.isPending;

  return (
    <View style={styles.page}>
      {hasCoordinates ? (
        <DeliveryMap
          style={styles.map}
          latitude={order.address!.latitude!}
          longitude={order.address!.longitude!}
          markers={[
            {
              id: order.id,
              latitude: order.address!.latitude!,
              longitude: order.address!.longitude!,
              title: order.orderNumber,
              description: order.address?.city,
              pinColor: colors.primary,
            },
          ]}
        />
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard>
          <View style={styles.headerRow}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Badge label={formatDriverStatus(order.status)} variant="primary" />
          </View>
          <DeliveryWorkflowBar status={order.status} />
        </GlassCard>

        <GlassCard style={styles.cardGap}>
          <Text style={styles.cardTitle}>Customer</Text>
          <Text style={styles.text}>{order.user?.fullName ?? '—'}</Text>
          {order.user?.phone ? (
            <AppButton
              title={`Call ${order.user.phone}`}
              variant="outline"
              size="sm"
              onPress={callCustomer}
              style={{ marginTop: spacing.sm }}
            />
          ) : (
            <Text style={styles.muted}>No phone on file</Text>
          )}
        </GlassCard>

        <GlassCard style={styles.cardGap}>
          <Text style={styles.cardTitle}>Delivery address</Text>
          <Text style={styles.text}>{formatAddress(order) || '—'}</Text>
          {!hasCoordinates && (
            <Text style={styles.muted}>No saved coordinates — navigation uses address text.</Text>
          )}
          <AppButton
            title="Open in Maps"
            variant="outline"
            onPress={openMaps}
            disabled={!formatAddress(order) && !hasCoordinates}
            style={{ marginTop: spacing.sm }}
            size="sm"
          />
        </GlassCard>

        <GlassCard style={styles.cardGap}>
          <Text style={styles.cardTitle}>Order summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Items</Text>
            <Text style={styles.text}>{itemCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Total</Text>
            <Text style={styles.totalValue}>${order.totalAmount.toFixed(2)}</Text>
          </View>
        </GlassCard>

        <GlassCard style={styles.cardGap}>
          <Text style={styles.cardTitle}>Payment</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Method</Text>
            <Text style={styles.text}>
              {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Status</Text>
            <Badge
              label={order.paymentStatus}
              variant={PAYMENT_STATUS_VARIANT[order.paymentStatus] ?? 'warning'}
            />
          </View>
          {order.paymentMethod === 'cash_on_delivery' && order.paymentStatus === 'unpaid' && order.status !== 'delivered' ? (
            <Text style={styles.muted}>Collect ${order.totalAmount.toFixed(2)} on delivery.</Text>
          ) : null}
          {order.paymentMethod === 'wish_money' && order.paymentStatus === 'unpaid' ? (
            <Text style={styles.muted}>Wish payment pending — do not collect.</Text>
          ) : null}
          {order.paymentMethod === 'wish_money' && order.paymentStatus === 'paid' ? (
            <Text style={styles.muted}>Paid via Wish — do not collect.</Text>
          ) : null}
        </GlassCard>

        <GlassCard style={styles.cardGap}>
          <Text style={styles.cardTitle}>Items ({itemCount})</Text>
          {order.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.text}>
                {item.productName} x{item.quantity}
              </Text>
              <Text style={styles.text}>${(item.unitPrice * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </GlassCard>

        {canReject && (
          <GlassCard style={styles.cardGap}>
            <AppInput
              label="Rejection reason (optional)"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Too far, vehicle issue"
            />
          </GlassCard>
        )}

        {order.status === 'on_the_way' && (
          <GlassCard style={styles.cardGap}>
            <Text style={styles.cardTitle}>Delivery signatures</Text>
            <Text style={styles.muted}>
              Both the driver and the client must sign to confirm delivery.
            </Text>
            <AppInput
              label="Delivered to (optional)"
              value={deliveredToName}
              onChangeText={setDeliveredToName}
              placeholder="Recipient name"
            />
            <AppInput
              label="Delivery note (optional)"
              value={deliveryNote}
              onChangeText={setDeliveryNote}
              multiline
              placeholder="e.g. Left with reception"
            />
            <SignaturePad label="Driver signature" onChange={setAgentSignature} />
            <SignaturePad label="Client signature" onChange={setClientSignature} />
          </GlassCard>
        )}

        {order.status === 'delivered' && order.deliveryProof && (
          <GlassCard style={styles.cardGap}>
            <Text style={styles.cardTitle}>Proof recorded</Text>
            {order.deliveryProof.deliveredToName ? (
              <Text style={styles.text}>Delivered to: {order.deliveryProof.deliveredToName}</Text>
            ) : null}
            {order.deliveryProof.deliveryNote ? (
              <Text style={styles.muted}>{order.deliveryProof.deliveryNote}</Text>
            ) : null}
            {order.deliveryProof.agentSignatureDataUrl ? (
              <View style={styles.sigBlock}>
                <Text style={styles.sigLabel}>Driver signature</Text>
                <SignatureImage uri={order.deliveryProof.agentSignatureDataUrl} />
              </View>
            ) : null}
            {order.deliveryProof.clientSignatureDataUrl ? (
              <View style={styles.sigBlock}>
                <Text style={styles.sigLabel}>Client signature</Text>
                <SignatureImage uri={order.deliveryProof.clientSignatureDataUrl} />
              </View>
            ) : null}
          </GlassCard>
        )}
      </ScrollView>

      <FloatingActionBar>
        {order.status === 'assigned' && (
          <>
            <AppButton
              title="Accept order"
              onPress={() => acceptMutation.mutate()}
              loading={acceptMutation.isPending}
              disabled={isActionPending && !acceptMutation.isPending}
              fullWidth
            />
            <AppButton
              title="Reject assignment"
              variant="danger"
              onPress={confirmReject}
              loading={rejectMutation.isPending}
              disabled={isActionPending && !rejectMutation.isPending}
              fullWidth
            />
          </>
        )}
        {order.status === 'accepted' && (
          <>
            <AppButton
              title="Mark picked up"
              onPress={() => pickedUpMutation.mutate()}
              loading={pickedUpMutation.isPending}
              disabled={isActionPending && !pickedUpMutation.isPending}
              fullWidth
            />
            <AppButton
              title="Reject assignment"
              variant="outline"
              onPress={confirmReject}
              loading={rejectMutation.isPending}
              disabled={isActionPending && !rejectMutation.isPending}
              fullWidth
            />
          </>
        )}
        {order.status === 'picked_up' && (
          <AppButton
            title="Mark on the way"
            onPress={() => onTheWayMutation.mutate()}
            loading={onTheWayMutation.isPending}
            disabled={isActionPending && !onTheWayMutation.isPending}
            fullWidth
          />
        )}
        {order.status === 'on_the_way' && (
          <AppButton
            title="Mark delivered"
            onPress={confirmDeliver}
            loading={deliveredMutation.isPending}
            disabled={
              (isActionPending && !deliveredMutation.isPending) ||
              !agentSignature ||
              !clientSignature
            }
            fullWidth
          />
        )}
        {order.status === 'delivered' && (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.doneText}>Delivery completed</Text>
          </View>
        )}
      </FloatingActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.mutedText },
  map: { height: 240, margin: spacing.md, marginBottom: 0 },
  content: { padding: spacing.md, paddingBottom: 200 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderNumber: { ...typography.h3, color: colors.text },
  cardGap: { marginTop: spacing.sm },
  cardTitle: { ...typography.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.bodySmall, color: colors.mutedText, marginTop: 2, marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  totalValue: { ...typography.h3, color: colors.primary },
  sigBlock: { marginTop: spacing.md },
  sigLabel: { ...typography.caption, color: colors.mutedText, marginBottom: 4, fontWeight: '600' },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  doneText: { ...typography.body, color: colors.success, fontWeight: '600' },
});
