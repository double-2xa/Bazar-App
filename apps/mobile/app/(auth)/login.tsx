import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, BRAND } from '@doublea/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { AppButton, AppInput } from '@/components';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      if (user.role === 'admin') {
        Alert.alert(
          'Admin Account',
          'Please use the admin dashboard website to manage the store.',
          [
            {
              text: 'Open Dashboard',
              onPress: () => Linking.openURL(process.env.EXPO_PUBLIC_ADMIN_URL || 'http://localhost:3000'),
            },
            {
              text: 'OK',
              onPress: () => {
                useAuthStore.getState().logout();
              },
            },
          ],
        );
        return;
      } else if (user.role === 'delivery_agent') {
        router.replace('/(delivery)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
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

        <Text style={styles.footer}>
          Don't have an account?{' '}
          <Text style={styles.link} onPress={() => router.push('/(auth)/register')}>
            Register
          </Text>
        </Text>
        <Text style={styles.footer}>
          Wholesale buyer?{' '}
          <Text style={styles.link} onPress={() => router.push('/(auth)/register?mode=company')}>
            Sign in as company
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
  footer: { ...typography.body, color: colors.mutedText, textAlign: 'center', marginTop: spacing.lg },
  link: { color: colors.primary, fontWeight: '600' },
});
