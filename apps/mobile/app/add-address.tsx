import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { addressSchema, type LebanonSettlement } from '@doublea/shared';
import { spacing, colors, typography, borderRadius } from '@/theme';
import { addressesApi, locationsApi } from '@/services/endpoints';
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

type FormValues = {
  label: string;
  fullName: string;
  phone: string;
  country: string;
  governorate?: string;
  district?: string;
  city?: string;
  settlementId?: string;
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracyM?: number;
  isDefault?: boolean;
};

export default function AddAddressScreen() {
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [selectedSettlement, setSelectedSettlement] = useState<LebanonSettlement | null>(null);
  const [gpsAttached, setGpsAttached] = useState(false);
  const queryClient = useQueryClient();

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: 'Home',
      fullName: '',
      phone: '',
      country: 'Lebanon',
      street: '',
      isDefault: true,
    },
  });

  const governorate = watch('governorate');
  const district = watch('district');

  const { data: hierarchy } = useQuery({
    queryKey: ['lebanon-hierarchy'],
    queryFn: locationsApi.getHierarchy,
  });

  const districts = useMemo(() => {
    if (!governorate || !hierarchy) return [];
    return hierarchy.districtsByGovernorate[governorate] ?? [];
  }, [governorate, hierarchy]);

  const { data: settlementsResult, isFetching: settlementsLoading } = useQuery({
    queryKey: ['lebanon-settlements', governorate, district, cityQuery],
    queryFn: () =>
      locationsApi.getSettlements({
        governorate,
        district,
        q: cityQuery || undefined,
        limit: 80,
      }),
    enabled: pickerOpen,
  });

  useEffect(() => {
    setValue('country', 'Lebanon');
  }, [setValue]);

  const attachGps = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to attach your exact pin.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setValue('latitude', position.coords.latitude);
      setValue('longitude', position.coords.longitude);
      setValue('locationAccuracyM', position.coords.accuracy ?? undefined);
      setGpsAttached(true);
    } catch {
      Alert.alert('Location error', 'Could not read your current GPS position.');
    } finally {
      setLocating(false);
    }
  };

  const clearGps = () => {
    setValue('latitude', undefined);
    setValue('longitude', undefined);
    setValue('locationAccuracyM', undefined);
    setGpsAttached(false);
  };

  const selectSettlement = (settlement: LebanonSettlement) => {
    setSelectedSettlement(settlement);
    setValue('settlementId', settlement.id);
    setValue('city', settlement.name);
    setValue('governorate', settlement.governorate ?? undefined);
    setValue('district', settlement.district ?? undefined);
    setPickerOpen(false);
  };

  const onSubmit = async (data: FormValues) => {
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
      const payload: Record<string, unknown> = {
        label: data.label,
        fullName: data.fullName,
        phone: data.phone,
        country: 'Lebanon',
        settlementId: data.settlementId,
        governorate: data.governorate,
        district: data.district,
        city: data.city,
        street: data.street,
        building: data.building || undefined,
        floor: data.floor || undefined,
        apartment: data.apartment || undefined,
        isDefault: data.isDefault ?? true,
      };
      if (data.latitude != null && data.longitude != null) {
        payload.latitude = data.latitude;
        payload.longitude = data.longitude;
        if (data.locationAccuracyM != null) payload.locationAccuracyM = data.locationAccuracyM;
      }
      await addressesApi.create(payload);
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
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Contact</Text>
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
            <AppInput label="Full name" value={value || ''} onChangeText={onChange} error={errors.fullName?.message} />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Phone"
              value={value || ''}
              onChangeText={onChange}
              keyboardType="phone-pad"
              error={errors.phone?.message}
            />
          )}
        />

        <Text style={styles.sectionTitle}>Lebanon location</Text>
        <Text style={styles.hint}>No postal code needed — pick your city, then describe where you are.</Text>

        <Text style={styles.fieldLabel}>Governorate</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {(hierarchy?.governorates ?? []).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, governorate === g && styles.chipActive]}
              onPress={() => {
                setValue('governorate', g);
                setValue('district', undefined);
                setValue('city', undefined);
                setValue('settlementId', undefined);
                setSelectedSettlement(null);
              }}
            >
              <Text style={[styles.chipText, governorate === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {districts.length > 0 ? (
          <>
            <Text style={styles.fieldLabel}>District</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {districts.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, district === d && styles.chipActive]}
                  onPress={() => {
                    setValue('district', d);
                    setValue('city', undefined);
                    setValue('settlementId', undefined);
                    setSelectedSettlement(null);
                  }}
                >
                  <Text style={[styles.chipText, district === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : null}

        <TouchableOpacity style={styles.cityPicker} onPress={() => setPickerOpen(true)}>
          <Text style={styles.fieldLabel}>City / settlement</Text>
          <Text style={selectedSettlement ? styles.cityValue : styles.cityPlaceholder}>
            {selectedSettlement
              ? `${selectedSettlement.name}${selectedSettlement.nameAr ? ` · ${selectedSettlement.nameAr}` : ''}`
              : 'Select from Lebanon basemap'}
          </Text>
          {errors.settlementId?.message ? (
            <Text style={styles.error}>{errors.settlementId.message}</Text>
          ) : null}
        </TouchableOpacity>

        <Controller
          control={control}
          name="street"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Exact location details"
              value={value || ''}
              onChangeText={onChange}
              multiline
              numberOfLines={3}
              placeholder="Building, floor, landmark, directions…"
              error={errors.street?.message}
              style={{ minHeight: 88, textAlignVertical: 'top' }}
            />
          )}
        />
        <Controller
          control={control}
          name="building"
          render={({ field: { onChange, value } }) => (
            <AppInput label="Building (optional)" value={value || ''} onChangeText={onChange} />
          )}
        />
        <Controller
          control={control}
          name="floor"
          render={({ field: { onChange, value } }) => (
            <AppInput label="Floor (optional)" value={value || ''} onChangeText={onChange} />
          )}
        />
        <Controller
          control={control}
          name="apartment"
          render={({ field: { onChange, value } }) => (
            <AppInput label="Apartment (optional)" value={value || ''} onChangeText={onChange} />
          )}
        />

        <Text style={styles.sectionTitle}>Live GPS pin (optional)</Text>
        <Text style={styles.hint}>
          Attach your exact position right now. It is encrypted in our database before storage.
        </Text>
        <View style={styles.gpsRow}>
          <AppButton
            title={gpsAttached ? 'Update GPS pin' : 'Attach my location'}
            onPress={attachGps}
            loading={locating}
            fullWidth
          />
        </View>
        {gpsAttached ? (
          <TouchableOpacity onPress={clearGps}>
            <Text style={styles.clearGps}>Clear attached pin</Text>
          </TouchableOpacity>
        ) : null}
        {gpsAttached ? (
          <Text style={styles.gpsOk}>Exact location attached and will be stored securely.</Text>
        ) : null}

        <AppButton
          title="Save Address"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          fullWidth
          style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}
        />
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select city</Text>
            <Pressable onPress={() => setPickerOpen(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <AppInput
            label="Search"
            value={cityQuery}
            onChangeText={setCityQuery}
            placeholder="Type city name (English or Arabic)"
            autoFocus
          />
          {settlementsLoading ? <ActivityIndicator color={colors.primary} /> : null}
          <FlatList
            data={settlementsResult?.data ?? []}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.settlementRow} onPress={() => selectSettlement(item)}>
                <Text style={styles.settlementName}>
                  {item.name}
                  {item.nameAr ? ` · ${item.nameAr}` : ''}
                </Text>
                <Text style={styles.settlementMeta}>
                  {[item.district, item.governorate].filter(Boolean).join(' · ')}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !settlementsLoading ? (
                <Text style={styles.hint}>No settlements match. Try another search.</Text>
              ) : null
            }
          />
        </View>
      </Modal>
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
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.mutedText, marginBottom: spacing.md },
  fieldLabel: { ...typography.bodySmall, color: colors.text, fontWeight: '500', marginBottom: spacing.xs },
  chipRow: { marginBottom: spacing.md, maxHeight: 44 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full ?? 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  cityPicker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  cityValue: { ...typography.body, color: colors.text, marginTop: 4 },
  cityPlaceholder: { ...typography.body, color: colors.mutedText, marginTop: 4 },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  gpsRow: { marginBottom: spacing.sm },
  clearGps: { ...typography.bodySmall, color: colors.danger, textAlign: 'center', marginBottom: spacing.sm },
  gpsOk: { ...typography.caption, color: colors.mapAccent ?? colors.primary, marginBottom: spacing.md },
  modal: { flex: 1, padding: spacing.md, paddingTop: spacing.xl, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { ...typography.h2, color: colors.text },
  modalClose: { ...typography.body, color: colors.primary, fontWeight: '600' },
  settlementRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  settlementName: { ...typography.body, color: colors.text, fontWeight: '600' },
  settlementMeta: { ...typography.caption, color: colors.mutedText, marginTop: 2 },
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
