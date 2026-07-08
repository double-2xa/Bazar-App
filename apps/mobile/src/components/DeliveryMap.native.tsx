import { StyleSheet, ViewStyle } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { borderRadius } from '@/theme';

interface DeliveryMapProps {
  latitude: number;
  longitude: number;
  style?: ViewStyle;
}

export function DeliveryMap({ latitude, longitude, style }: DeliveryMapProps) {
  return (
    <MapView
      style={[styles.map, style]}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker coordinate={{ latitude, longitude }} title="Delivery" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { borderRadius: borderRadius.lg },
});
