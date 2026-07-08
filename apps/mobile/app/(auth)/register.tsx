import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, registerCompanySchema } from '@doublea/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '@/theme';
import { authApi } from '@/services/endpoints';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { AppButton, AppInput } from '@/components';

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const schema = isCompany ? registerCompanySchema : registerSchema;
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '', password: '', fullName: '', phone: '',
      companyName: '', vatNumber: '', businessAddress: '', contactPerson: '', companyPhone: '',
    },
  });

  const onSubmit = async (data: Record<string, string>) => {
    setLoading(true);
    try {
      const result = isCompany
        ? await authApi.registerCompany(data)
        : await authApi.register(data);
      await tokenStorage.setItemAsync('accessToken', result.tokens.accessToken);
      await tokenStorage.setItemAsync('refreshToken', result.tokens.refreshToken);
      setUser(result.user);
      Alert.alert('Success', isCompany ? 'Company account created. Pending approval.' : 'Account created successfully!');
      router.back();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toggle}>
          <TouchableOpacity style={[styles.toggleBtn, !isCompany && styles.toggleActive]} onPress={() => setIsCompany(false)}>
            <Text style={[styles.toggleText, !isCompany && styles.toggleTextActive]}>Personal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, isCompany && styles.toggleActive]} onPress={() => setIsCompany(true)}>
            <Text style={[styles.toggleText, isCompany && styles.toggleTextActive]}>Company</Text>
          </TouchableOpacity>
        </View>

        <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
          <AppInput label="Full Name" value={value} onChangeText={onChange} error={errors.fullName?.message} />
        )} />
        <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
          <AppInput label="Email" value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
        )} />
        <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
          <AppInput label="Phone" value={value || ''} onChangeText={onChange} keyboardType="phone-pad" />
        )} />
        <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
          <AppInput label="Password" value={value} onChangeText={onChange} secureTextEntry error={errors.password?.message} />
        )} />

        {isCompany && (
          <>
            <Controller control={control} name="companyName" render={({ field: { onChange, value } }) => (
              <AppInput label="Company Name" value={value || ''} onChangeText={onChange} error={(errors as Record<string, { message?: string }>).companyName?.message} />
            )} />
            <Controller control={control} name="vatNumber" render={({ field: { onChange, value } }) => (
              <AppInput label="VAT Number" value={value || ''} onChangeText={onChange} error={(errors as Record<string, { message?: string }>).vatNumber?.message} />
            )} />
            <Controller control={control} name="businessAddress" render={({ field: { onChange, value } }) => (
              <AppInput label="Business Address" value={value || ''} onChangeText={onChange} error={(errors as Record<string, { message?: string }>).businessAddress?.message} />
            )} />
            <Controller control={control} name="contactPerson" render={({ field: { onChange, value } }) => (
              <AppInput label="Contact Person" value={value || ''} onChangeText={onChange} error={(errors as Record<string, { message?: string }>).contactPerson?.message} />
            )} />
            <Controller control={control} name="companyPhone" render={({ field: { onChange, value } }) => (
              <AppInput label="Company Phone" value={value || ''} onChangeText={onChange} keyboardType="phone-pad" error={(errors as Record<string, { message?: string }>).companyPhone?.message} />
            )} />
          </>
        )}

        <AppButton title="Create Account" onPress={handleSubmit(onSubmit)} loading={loading} fullWidth size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  toggle: { flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.sm },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  toggleActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  toggleText: { ...typography.body, color: colors.mutedText },
  toggleTextActive: { color: colors.primary, fontWeight: '600' },
});
