import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, BRAND } from '@doublea/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { AppButton, AppInput } from '@/components';
import { routeAfterAuth } from '@/utils/routeAfterAuth';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      routeAfterAuth(user);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      Alert.alert('Error', typeof message === 'string' ? message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      routeAfterAuth(user);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const message =
        apiMessage ||
        (err instanceof Error ? err.message : null) ||
        'Google Sign-In failed';
      if (message.includes('cancelled')) return;
      Alert.alert('Error', typeof message === 'string' ? message : 'Google Sign-In failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to {BRAND.shopName}</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <AppInput label="Email" value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <AppInput label="Password" value={value} onChangeText={onChange} secureTextEntry error={errors.password?.message} />
          )}
        />

        <AppButton title="Sign In" onPress={handleSubmit(onSubmit)} loading={loading} fullWidth size="lg" />

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

        <Text style={styles.footer}>
          Don't have an account?{' '}
          <Text style={styles.link} onPress={() => router.push('/(auth)/register')}>
            Register
          </Text>
        </Text>
        <Text style={styles.footer}>
          Wholesale buyer?{' '}
          <Text style={styles.link} onPress={() => router.push('/(auth)/register?mode=company')}>
            Register as company
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.mutedText, marginBottom: spacing.xl },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.bodySmall, color: colors.mutedText },
  footer: { ...typography.body, color: colors.mutedText, textAlign: 'center', marginTop: spacing.lg },
  link: { color: colors.primary, fontWeight: '600' },
});
