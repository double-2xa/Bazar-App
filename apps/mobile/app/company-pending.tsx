import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '@doublea/shared';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/endpoints';
import { colors, spacing, typography, radius } from '@/theme';
import { AppButton, Badge } from '@/components';
import { isCompanyAwaitingAccess } from '@/utils/companyAccess';

export default function CompanyPendingScreen() {
  const { user, setUser, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const status = user?.companyProfile?.status ?? 'pending';
  const companyName = user?.companyProfile?.companyName;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const me = await authApi.me();
      setUser(me);
      if (me.role === 'company' && me.companyProfile?.status === 'approved') {
        Alert.alert('Approved', 'Your wholesale account is active. Welcome to the store.');
        router.replace('/(tabs)');
      }
    } catch {
      /* keep cached session */
    } finally {
      setRefreshing(false);
    }
  }, [setUser]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      if (user.role === 'company' && user.companyProfile?.status === 'approved') {
        router.replace('/(tabs)');
        return;
      }
      if (user.role !== 'company') {
        router.replace('/(tabs)');
      }
    }, [user]),
  );

  useEffect(() => {
    if (!isCompanyAwaitingAccess(user) || status === 'rejected') return;
    const id = setInterval(() => {
      void refresh();
    }, 20000);
    return () => clearInterval(id);
  }, [user, status, refresh]);

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={status === 'rejected' ? 'close-circle' : 'time'}
            size={40}
            color={status === 'rejected' ? colors.danger : colors.warning}
          />
        </View>

        <Text style={styles.title}>
          {status === 'rejected' ? 'Application not approved' : 'Waiting for approval'}
        </Text>
        <Text style={styles.subtitle}>
          {companyName
            ? `${companyName} · ${BRAND.shopName}`
            : `Wholesale account · ${BRAND.shopName}`}
        </Text>

        <Badge
          label={status === 'rejected' ? 'Rejected' : 'Pending admin review'}
          variant={status === 'rejected' ? 'danger' : 'warning'}
        />

        <Text style={styles.body}>
          {status === 'rejected'
            ? 'An admin reviewed your wholesale request and did not approve it. Contact the store if you need help, or sign out and use a personal account.'
            : 'Your company signup was received. An admin must approve it on the dashboard before you can browse, order, or use wholesale pricing. Pull refresh or tap Check status after you are notified.'}
        </Text>

        {status !== 'rejected' ? (
          <AppButton
            title="Check status"
            onPress={refresh}
            loading={refreshing}
            fullWidth
            size="lg"
          />
        ) : null}

        <AppButton
          title="Sign out"
          onPress={onLogout}
          fullWidth
          size="lg"
          variant="outline"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.mutedText },
  body: { ...typography.body, color: colors.mutedText, marginVertical: spacing.sm },
});
