import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/theme';

interface DeliveryMapProps {
  latitude: number;
  longitude: number;
  style?: ViewStyle;
}

export function DeliveryMap({ latitude, longitude, style }: DeliveryMapProps) {
  return (
    <View style={[styles.placeholder, style]}>
      <Ionicons name="map-outline" size={32} color={colors.mutedText} />
      <Text style={styles.text}>Map available on mobile app</Text>
      <Text style={styles.coords}>
        {latitude.toFixed(4)}, {longitude.toFixed(4)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  text: { ...typography.bodySmall, color: colors.mutedText },
  coords: { ...typography.caption, color: colors.mutedText },
});
