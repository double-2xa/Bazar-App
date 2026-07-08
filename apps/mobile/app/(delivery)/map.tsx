import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';
import { EmptyState } from '@/components';

export default function DeliveryMapScreen() {
  return (
    <View style={styles.container}>
      <EmptyState icon="map-outline" title="Delivery Map" subtitle="Active delivery locations will appear on the map" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
