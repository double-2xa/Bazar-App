import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Address } from '@doublea/shared';
import { addressesApi } from '@/services/endpoints';
import { getErrorMessage } from '@/services/getErrorMessage';
import { AppButton, EmptyState, GlassCard, ScreenContainer } from '@/components';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { hapticSelection } from '@/utils/haptics';

export default function AddressListScreen() {
  const queryClient = useQueryClient();

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressesApi.getAll,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => addressesApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      hapticSelection();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => addressesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      hapticSelection();
    },
    onError: (err) => Alert.alert('Remove failed', getErrorMessage(err, 'Could not remove address')),
  });

  const handleRemove = (address: Address) => {
    Alert.alert('Remove address', `Remove ${address.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMutation.mutate(address.id),
      },
    ]);
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Delivery addresses</Text>
            <Text style={styles.subtitle}>Manage where your orders are delivered</Text>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="location-outline" title="No addresses yet" subtitle="Add your first delivery address" />
          ) : null
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.labelRow}>
                <Ionicons name="location" size={18} color={colors.mapAccent} />
                <Text style={styles.label}>{item.label}</Text>
                {item.isDefault ? <Text style={styles.defaultBadge}>Default</Text> : null}
              </View>
              <Text style={styles.name}>{item.fullName} · {item.phone}</Text>
              <Text style={styles.addressLine}>{item.street}</Text>
              <Text style={styles.addressLine}>
                {[item.city, item.district, item.governorate].filter(Boolean).join(', ')}
              </Text>
              {item.hasExactLocation || (item.latitude && item.longitude) ? (
                <Text style={styles.geoTag}>Exact GPS pin saved securely</Text>
              ) : null}
            </View>
            <View style={styles.actions}>
              {!item.isDefault ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setDefaultMutation.mutate(item.id)}
                  accessibilityLabel="Set as default address"
                >
                  <Text style={styles.actionText}>Set default</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleRemove(item)}
                accessibilityLabel="Remove address"
              >
                <Text style={[styles.actionText, styles.dangerText]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}
        ListFooterComponent={
          <AppButton
            title="Add New Address"
            onPress={() => router.push('/add-address')}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.mutedText, marginTop: 4 },
  list: { padding: spacing.md, flexGrow: 1, paddingBottom: spacing.xl },
  card: { marginBottom: spacing.md },
  cardTop: { gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.body, fontWeight: '700', color: colors.text },
  defaultBadge: {
    ...typography.caption,
    color: colors.primaryDark,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  name: { ...typography.bodySmall, color: colors.textSecondary },
  addressLine: { ...typography.bodySmall, color: colors.mutedText },
  geoTag: { ...typography.caption, color: colors.mapAccent, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  actionBtn: { paddingVertical: spacing.xs },
  actionText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  dangerText: { color: colors.danger },
});
