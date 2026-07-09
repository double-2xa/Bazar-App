import { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { addressSchema } from '@doublea/shared';
import { spacing } from '@/theme';
import { addressesApi } from '@/services/endpoints';
import { AppButton, AppInput, ScreenContainer } from '@/components';
import { hapticSuccess } from '@/utils/haptics';

export default function AddAddressScreen() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { label: 'Home', fullName: '', phone: '', country: 'USA', city: '', street: '', postalCode: '', isDefault: true },
  });

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

  const fields = ['label', 'fullName', 'phone', 'country', 'city', 'street', 'postalCode'] as const;

  return (
    <ScreenContainer contentStyle={{ padding: spacing.md }}>
      {fields.map((f) => (
        <Controller
          key={f}
          control={control}
          name={f}
          render={({ field: { onChange, value } }) => (
            <AppInput
              label={f.charAt(0).toUpperCase() + f.slice(1)}
              value={value || ''}
              onChangeText={onChange}
              error={errors[f]?.message}
            />
          )}
        />
      ))}
      <AppButton title="Save Address" onPress={handleSubmit(onSubmit)} loading={loading} fullWidth />
    </ScreenContainer>
  );
}
