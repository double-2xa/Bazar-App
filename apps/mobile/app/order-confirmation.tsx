import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/theme';
import { AppButton } from '@/components';

export default function OrderConfirmationScreen() {
  const { orderNumber, total } = useLocalSearchParams<{ orderNumber: string; total: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        </View>
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.subtitle}>Thank you for shopping with DoubleA Commerce</Text>
        <View style={styles.details}>
          <Text style={styles.label}>Order Number</Text>
          <Text style={styles.value}>{orderNumber}</Text>
          <Text style={[styles.label, { marginTop: spacing.md }]}>Total</Text>
          <Text style={styles.total}>${parseFloat(total || '0').toFixed(2)}</Text>
        </View>
        <AppButton title="View Orders" onPress={() => router.replace('/(tabs)/orders')} fullWidth style={{ marginTop: spacing.xl }} />
        <AppButton title="Continue Shopping" variant="outline" onPress={() => router.replace('/(tabs)')} fullWidth style={{ marginTop: spacing.sm }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconWrap: { marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.mutedText, textAlign: 'center', marginTop: spacing.sm },
  details: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, marginTop: spacing.xl, width: '100%', alignItems: 'center' },
  label: { ...typography.caption, color: colors.mutedText },
  value: { ...typography.h3, color: colors.text, marginTop: 4 },
  total: { ...typography.h2, color: colors.primary, marginTop: 4 },
});
