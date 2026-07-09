import { StyleSheet, ViewStyle } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { borderRadius, colors } from '@/theme';
import type { MapMarker } from '@/types/map';

interface DeliveryMapProps {
  latitude: number;
  longitude: number;
  markers?: MapMarker[];
  style?: ViewStyle;
}

export type { MapMarker };

export function DeliveryMap({ latitude, longitude, markers = [], style }: DeliveryMapProps) {
  const allMarkers: MapMarker[] =
    markers.length > 0
      ? markers
      : [{ id: 'primary', latitude, longitude, title: 'Delivery', pinColor: colors.primary }];

  const lats = allMarkers.map((m) => m.latitude);
  const lngs = allMarkers.map((m) => m.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latDelta = Math.max((maxLat - minLat) * 1.6, 0.02);
  const lngDelta = Math.max((maxLng - minLng) * 1.6, 0.02);

  return (
    <MapView
      style={[styles.map, style]}
      initialRegion={{
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      }}
    >
      {allMarkers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
          title={marker.title}
          description={marker.description}
          pinColor={marker.pinColor}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { borderRadius: borderRadius.lg },
});
