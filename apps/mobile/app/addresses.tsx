import { FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { addressesApi } from '@/services/endpoints';
import { AppButton, EmptyState } from '@/components';

export default function AddressListScreen() {
  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: addressesApi.getAll,
  });

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="location-outline" title="No addresses" subtitle="Add a delivery address" />}
        renderItem={({ item }) => (
          <AppButton
            title={`${item.label} - ${item.street}, ${item.city}`}
            variant="outline"
            onPress={() => {}}
            style={styles.addressBtn}
          />
        )}
        ListFooterComponent={
          <AppButton title="Add New Address" onPress={() => router.push('/add-address')} fullWidth style={{ marginTop: spacing.md }} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, flexGrow: 1 },
  addressBtn: { marginBottom: spacing.sm },
});
