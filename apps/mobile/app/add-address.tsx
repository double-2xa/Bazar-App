import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { addressSchema, LEBANON_PLACES } from '@doublea/shared';
import { colors, spacing, typography, radius } from '@/theme';
import { addressesApi } from '@/services/endpoints';
import { AppButton, AppInput, ScreenContainer } from '@/components';
import { hapticSuccess } from '@/utils/haptics';

export default function AddAddressScreen() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: 'Home',
      fullName: '',
      phone: '',
      country: 'Lebanon',
      city: '',
      street: '',
      postalCode: '0000',
      isDefault: true,
      latitude: undefined as number | undefined,
      longitude: undefined as number | undefined,
    },
  });

  const selectedCity = watch('city');

  const selectPlace = (place: (typeof LEBANON_PLACES)[number]) => {
    setValue('city', place.name, { shouldValidate: true });
    setValue('country', 'Lebanon', { shouldValidate: true });
    setValue('latitude', place.lat, { shouldValidate: true });
    setValue('longitude', place.lng, { shouldValidate: true });
  };

  const onSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      await addressesApi.create(data as never);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      await hapticSuccess();
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer contentStyle={{ padding: spacing.md }}>
      <Controller
        control={control}
        name="label"
        render={({ field: { onChange, value } }) => (
          <AppInput label="Label" value={value || ''} onChangeText={onChange} error={errors.label?.message} />
        )}
      />
      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, value } }) => (
          <AppInput label="Full Name" value={value || ''} onChangeText={onChange} error={errors.fullName?.message} />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <AppInput label="Phone" value={value || ''} onChangeText={onChange} keyboardType="phone-pad" error={errors.phone?.message} />
        )}
      />

      <Text style={styles.sectionLabel}>City / area</Text>
      <Text style={styles.sectionHint}>Pick from the delivery list — fee is calculated from distance to the store.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeRow}>
        {LEBANON_PLACES.map((place) => {
          const active = selectedCity === place.name;
          return (
            <TouchableOpacity
              key={place.id}
              style={[styles.placeChip, active && styles.placeChipActive]}
              onPress={() => selectPlace(place)}
            >
              <Text style={[styles.placeChipText, active && styles.placeChipTextActive]}>{place.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {errors.city?.message ? <Text style={styles.error}>{errors.city.message}</Text> : null}

      <Controller
        control={control}
        name="street"
        render={({ field: { onChange, value } }) => (
          <AppInput label="Street" value={value || ''} onChangeText={onChange} error={errors.street?.message} />
        )}
      />
      <Controller
        control={control}
        name="postalCode"
        render={({ field: { onChange, value } }) => (
          <AppInput label="Postal Code" value={value || ''} onChangeText={onChange} error={errors.postalCode?.message} />
        )}
      />

      <View style={styles.countryRow}>
        <Text style={styles.countryLabel}>Country</Text>
        <Text style={styles.countryValue}>Lebanon</Text>
      </View>

      <AppButton title="Save Address" onPress={handleSubmit(onSubmit)} loading={loading} fullWidth />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { ...typography.bodySmall, color: colors.text, fontWeight: '600', marginBottom: 4 },
  sectionHint: { ...typography.caption, color: colors.mutedText, marginBottom: spacing.sm },
  placeRow: { gap: spacing.sm, paddingBottom: spacing.md },
  placeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeChipActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  placeChipText: { ...typography.bodySmall, color: colors.mutedText, fontWeight: '500' },
  placeChipTextActive: { color: colors.primaryDark, fontWeight: '700' },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  countryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  countryLabel: { ...typography.bodySmall, color: colors.mutedText },
  countryValue: { ...typography.body, color: colors.text, fontWeight: '600' },
});
