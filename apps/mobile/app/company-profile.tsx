import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing, typography, radius } from '@/theme';
import { GlassCard, Badge, ScreenContainer } from '@/components';

const STATUS_CONFIG = {
  approved: { label: 'Approved wholesale account', variant: 'success' as const, icon: 'checkmark-circle' as const },
  pending: { label: 'Pending approval', variant: 'warning' as const, icon: 'time' as const },
  rejected: { label: 'Application rejected', variant: 'danger' as const, icon: 'close-circle' as const },
};

export default function CompanyProfileScreen() {
  const { user } = useAuthStore();
  const profile = user?.companyProfile;
  const status = profile?.status ?? 'pending';
  const statusMeta = STATUS_CONFIG[status];

  return (
    <ScreenContainer>
      <GlassCard style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="business" size={28} color={colors.companyBadge} />
        </View>
        <Text style={styles.companyName}>{profile?.companyName || 'Company profile'}</Text>
        <Badge label={statusMeta.label} variant={statusMeta.variant} />
        {status === 'pending' ? (
          <Text style={styles.pendingCopy}>
            Your wholesale application is being reviewed. Company pricing unlocks after approval.
          </Text>
        ) : null}
      </GlassCard>

      <Text style={styles.sectionTitle}>Business details</Text>
      {[
        { label: 'VAT number', value: profile?.vatNumber },
        { label: 'Contact person', value: profile?.contactPerson },
        { label: 'Company phone', value: profile?.companyPhone },
        { label: 'Business address', value: profile?.businessAddress },
      ].map((row) => (
        <GlassCard key={row.label} style={styles.detailCard}>
          <Text style={styles.detailLabel}>{row.label}</Text>
          <Text style={styles.detailValue}>{row.value || '—'}</Text>
        </GlassCard>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'flex-start', gap: spacing.sm },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.companyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: { ...typography.h2, color: colors.text },
  pendingCopy: { ...typography.bodySmall, color: colors.mutedText, marginTop: spacing.xs },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  detailCard: { marginBottom: spacing.sm },
  detailLabel: { ...typography.caption, color: colors.mutedText },
  detailValue: { ...typography.body, color: colors.text, marginTop: 4, fontWeight: '500' },
});
