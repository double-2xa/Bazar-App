import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/theme';
import { AppButton } from '@/components';

export default function DeliveryCompletedScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={100} color={colors.success} />
        </View>
        <Text style={styles.title}>Order completed successfully</Text>
        {orderNumber && <Text style={styles.orderNumber}>{orderNumber}</Text>}
        <AppButton title="Back to Orders" onPress={() => router.replace('/(delivery)')} fullWidth style={{ marginTop: spacing.xxl }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconWrap: { marginBottom: spacing.xl },
  title: { ...typography.h2, color: colors.text, textAlign: 'center' },
  orderNumber: { ...typography.body, color: colors.mutedText, marginTop: spacing.sm },
});
