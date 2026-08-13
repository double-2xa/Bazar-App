import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, registerCompanySchema } from '@doublea/shared';
import type { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '@/theme';
import { authApi } from '@/services/endpoints';
import { getApiUrl } from '@/services/getApiUrl';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { AppButton, AppInput } from '@/components';
import { routeAfterAuth } from '@/utils/routeAfterAuth';
import { showAlert } from '@/utils/showAlert';

function apiErrorMessage(err: unknown, fallback: string) {
  const axiosErr = err as {
    code?: string;
    message?: string;
    response?: { data?: { message?: string | string[] } };
  };
  const raw = axiosErr.response?.data?.message;
  if (Array.isArray(raw)) return raw.join(', ');
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (axiosErr.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (err instanceof Error && err.message) return err.message;
  if (axiosErr.message) return axiosErr.message;
  return fallback;
}

/** Direct fetch — avoids axios interceptors masking a successful create. */
async function submitCompanyRegistration(payload: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(`${getApiUrl()}/auth/register-company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
      email?: string;
      companyName?: string;
    };
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      throw new Error(msg || `Registration failed (${res.status})`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export default function RegisterScreen() {
  const googleAuthEnabled = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim());
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isCompany, setIsCompany] = useState(mode === 'company');
  const submittingRef = useRef(false);
  const setUser = useAuthStore((s) => s.setUser);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  useEffect(() => {
    if (mode === 'company') setIsCompany(true);
  }, [mode]);

  const schema = isCompany ? registerCompanySchema : registerSchema;
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '', password: '', fullName: '', phone: '',
      companyName: '', vatNumber: '', businessAddress: '', contactPerson: '', companyPhone: '',
    },
  });

  const finishCompanySuccess = (message?: string) => {
    showAlert(
      'Request submitted',
      message ||
        'Your wholesale request was sent for admin approval. Continue as a guest — we will notify you when you can sign in.',
    );
    try {
      router.replace('/(tabs)');
    } catch {
      /* ignore navigation errors after a successful submit */
    }
  };

  const onSubmit = async (data: z.infer<typeof registerSchema> & z.infer<typeof registerCompanySchema>) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    try {
      if (isCompany) {
        try {
          const result = await submitCompanyRegistration({
            email: data.email.trim(),
            password: data.password,
            fullName: data.fullName.trim(),
            ...(data.phone?.trim() ? { phone: data.phone.trim() } : {}),
            companyName: data.companyName.trim(),
            vatNumber: data.vatNumber.trim(),
            businessAddress: data.businessAddress.trim(),
            contactPerson: data.contactPerson.trim(),
            companyPhone: data.companyPhone.trim(),
          });
          finishCompanySuccess(typeof result.message === 'string' ? result.message : undefined);
        } catch (err: unknown) {
          const message = apiErrorMessage(err, 'Registration failed');
          // Duplicate tap / retry after success — request already exists on the server.
          if (/already registered/i.test(message)) {
            finishCompanySuccess(
              'A wholesale request with this email was already submitted. Wait for admin approval, then sign in.',
            );
            return;
          }
          showAlert('Error', message);
        }
        return;
      }

      const result = await authApi.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
      });
      await tokenStorage.setItemAsync('accessToken', result.tokens.accessToken);
      await tokenStorage.setItemAsync('refreshToken', result.tokens.refreshToken);
      setUser(result.user);
      showAlert('Success', 'Account created successfully!', () => routeAfterAuth(result.user));
    } catch (err: unknown) {
      showAlert('Error', apiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      showAlert('Success', 'Account ready!', () => routeAfterAuth(user));
    } catch (err: unknown) {
      const message = apiErrorMessage(err, 'Google Sign-In failed');
      if (message.includes('cancelled')) return;
      showAlert('Error', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {isCompany ? (
          <Text style={styles.companyIntro}>
            Submit a wholesale account request. You stay signed out until an admin approves it — we will notify you when you can sign in.
          </Text>
        ) : null}

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
          <AppInput
            label="Password"
            value={value}
            onChangeText={onChange}
            secureTextEntry
            error={errors.password?.message}
          />
        )} />
        <Text style={styles.hint}>Password must be at least 6 characters. No other restrictions.</Text>

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
              <AppInput label="Company Phone / WhatsApp" value={value || ''} onChangeText={onChange} keyboardType="phone-pad" error={(errors as Record<string, { message?: string }>).companyPhone?.message} />
            )} />
          </>
        )}

        <AppButton
          title={isCompany ? 'Request Company Account' : 'Create Account'}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          fullWidth
          size="lg"
        />

        {!isCompany && googleAuthEnabled ? (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>
            <AppButton
              title="Continue with Google"
              onPress={onGoogle}
              loading={googleLoading}
              fullWidth
              size="lg"
              variant="outline"
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  companyIntro: {
    ...typography.bodySmall,
    color: colors.mutedText,
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.caption,
    color: colors.mutedText,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  toggle: { flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.sm },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  toggleActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  toggleText: { ...typography.body, color: colors.mutedText },
  toggleTextActive: { color: colors.primary, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.bodySmall, color: colors.mutedText },
});
