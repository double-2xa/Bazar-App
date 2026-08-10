import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme';
import { BRAND } from '@doublea/shared';
import { useAuthStore } from '@/store/authStore';
import { AppButton, EmptyState } from '@/components';
import { confirmAction } from '@/utils/showAlert';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    if (signingOut) return;
    const confirmed = await confirmAction('Sign Out', 'Are you sure you want to sign out?');
    if (!confirmed) return;

    setSigningOut(true);
    try {
      await logout();
      router.replace('/(tabs)');
    } finally {
      setSigningOut(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={colors.mutedText} />
          </View>
          <Text style={styles.guestTitle}>Welcome to {BRAND.shopName}</Text>
          <Text style={styles.guestSubtitle}>Sign in for the full experience</Text>
          <AppButton title="Sign In" onPress={() => router.push('/(auth)/login')} style={{ marginTop: spacing.lg }} />
          <AppButton
            title="Create Account"
            variant="outline"
            onPress={() => router.push('/(auth)/register')}
            style={{ marginTop: spacing.sm }}
          />
          <AppButton
            title="Register as Company"
            variant="outline"
            onPress={() => router.push('/(auth)/register?mode=company')}
            style={{ marginTop: spacing.sm }}
          />
          <Text style={styles.companyHint}>
            Request a wholesale account. An admin will review and activate it.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const menuItems = [
    { icon: 'location-outline' as const, label: 'Addresses', route: '/addresses' },
    { icon: 'heart-outline' as const, label: 'Wishlist', route: '/wishlist' },
    ...(user?.role === 'company'
      ? [{ icon: 'business-outline' as const, label: 'Company Profile', route: '/company-profile' }]
      : []),
    { icon: 'settings-outline' as const, label: 'Settings', route: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarFilled}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.fullName}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.role === 'company' && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>Company Account</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => item.route && router.push(item.route as never)}
            >
              <Ionicons name={item.icon} size={22} color={colors.text} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
            </TouchableOpacity>
          ))}
        </View>

        <AppButton
          title="Sign Out"
          variant="outline"
          onPress={handleLogout}
          loading={signingOut}
          disabled={signingOut}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  guestHeader: { alignItems: 'center', paddingTop: spacing.xxl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: { ...typography.h2, color: colors.text, marginTop: spacing.md },
  guestSubtitle: { ...typography.body, color: colors.mutedText, marginTop: spacing.xs },
  companyHint: {
    ...typography.caption,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  avatarFilled: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.secondary },
  profileInfo: { marginLeft: spacing.md, flex: 1 },
  name: { ...typography.h3, color: colors.text },
  email: { ...typography.bodySmall, color: colors.mutedText },
  roleBadge: {
    backgroundColor: colors.companyBadge + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  roleText: { ...typography.caption, color: colors.companyBadge, fontWeight: '600' },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  menuLabel: { ...typography.body, color: colors.text, flex: 1 },
});
