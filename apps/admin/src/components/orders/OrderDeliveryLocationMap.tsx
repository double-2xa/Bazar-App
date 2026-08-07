'use client';

import { useEffect, useMemo } from 'react';
import { Circle, LayersControl, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LEBANON_MAP } from '@doublea/shared';
import 'leaflet/dist/leaflet.css';

type OrderDeliveryLocationMapProps = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  capturedAt: string | null;
};

const exactPinIcon = L.divIcon({
  className: 'order-location-pin-wrap',
  html: '<span class="order-location-pin"><span></span></span>',
  iconSize: [34, 42],
  iconAnchor: [17, 39],
});

function CenterOnDestination({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], 17, { animate: false });
    map.setMaxBounds(
      L.latLngBounds(
        L.latLng(LEBANON_MAP.boundsSouthWest[0], LEBANON_MAP.boundsSouthWest[1]),
        L.latLng(LEBANON_MAP.boundsNorthEast[0], LEBANON_MAP.boundsNorthEast[1]),
      ),
    );
  }, [latitude, longitude, map]);
  return null;
}

export default function OrderDeliveryLocationMap({
  latitude,
  longitude,
  accuracyM,
  capturedAt,
}: OrderDeliveryLocationMapProps) {
  const center = useMemo(() => [latitude, longitude] as [number, number], [latitude, longitude]);
  const safeAccuracy = Number.isFinite(accuracyM) ? Math.min(Math.max(accuracyM ?? 0, 0), 5000) : 0;

  return (
    <div className="order-location-map-shell">
      <MapContainer
        center={center}
        zoom={17}
        minZoom={8}
        maxZoom={19}
        scrollWheelZoom={false}
        attributionControl
        className="order-location-map"
      >
        <CenterOnDestination latitude={latitude} longitude={longitude} />
        <LayersControl position="topright">
          <LayersControl.BaseLayer name="Street map">
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Topographic">
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution='Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, SRTM | Map style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
              maxNativeZoom={17}
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked name="Aerial photo">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Imagery &copy; <a href="https://www.esri.com/">Esri</a> and contributors'
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        {safeAccuracy > 0 ? (
          <Circle
            center={center}
            radius={safeAccuracy}
            pathOptions={{ color: '#007aff', weight: 1, fillColor: '#007aff', fillOpacity: 0.1 }}
          />
        ) : null}
        <Marker position={center} icon={exactPinIcon} />
      </MapContainer>
      <div className="order-location-map__privacy">
        <span className="order-location-map__privacy-dot" />
        Shared for delivery · external basemap
      </div>
      <div className="order-location-map__meta">
        <span>GPS pin</span>
        {safeAccuracy > 0 ? <span>Accuracy ±{Math.round(safeAccuracy)} m</span> : null}
        {capturedAt ? <span>Shared {new Date(capturedAt).toLocaleString()}</span> : null}
      </div>
    </div>
  );
}
