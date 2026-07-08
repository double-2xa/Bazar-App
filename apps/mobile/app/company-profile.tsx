import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing, typography } from '@/theme';

export default function CompanyProfileScreen() {
  const { user } = useAuthStore();
  const profile = user?.companyProfile;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{profile?.companyName || 'Company Profile'}</Text>
      <View style={styles.row}><Text style={styles.label}>VAT Number</Text><Text>{profile?.vatNumber}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Contact</Text><Text>{profile?.contactPerson}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Phone</Text><Text>{profile?.companyPhone}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Address</Text><Text>{profile?.businessAddress}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={{ color: profile?.status === 'approved' ? colors.success : colors.warning }}>{profile?.status}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  title: { ...typography.h2, marginBottom: spacing.lg },
  row: { marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.mutedText, marginBottom: 4 },
});
