import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ordersApi } from '@/services/endpoints';
import { colors, spacing, typography } from '@/theme';
import { AppButton } from '@/components';

/** Deep-link landing after Whish redirect (`nicepricebazar://whish-return?...`). */
export default function WhishReturnScreen() {
  const { orderId, status } = useLocalSearchParams<{ orderId?: string; status?: string }>();
  const [message, setMessage] = useState('Confirming Wish Money payment…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!orderId) {
        setMessage('Missing order. Return to checkout and try again.');
        setFailed(true);
        return;
      }
      if (status === 'failure') {
        setMessage('Wish Money payment was not completed.');
        setFailed(true);
        return;
      }
      try {
        const verified = await ordersApi.verifyWhishPayment(orderId);
        if (cancelled) return;
        if (verified.paymentStatus === 'paid' || verified.collectStatus === 'success') {
          router.replace({
            pathname: '/order-confirmation',
            params: {
              orderNumber: verified.orderNumber,
              total: String(verified.totalAmount ?? 0),
            },
          });
          return;
        }
        setMessage('Payment is still pending. Finish in Wish Money, then verify from your order.');
        setFailed(true);
      } catch {
        if (cancelled) return;
        setMessage('Could not confirm payment. Open your order to verify again.');
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, status]);

  return (
    <View style={styles.container}>
      {!failed ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      <Text style={styles.message}>{message}</Text>
      {failed ? (
        <AppButton
          title={orderId ? 'View order' : 'Go home'}
          onPress={() =>
            orderId ? router.replace(`/order/${orderId}`) : router.replace('/(tabs)')
          }
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
