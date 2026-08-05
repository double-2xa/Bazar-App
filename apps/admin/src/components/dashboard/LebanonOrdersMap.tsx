'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { DashboardMapOrder } from '@doublea/shared';
import { LEBANON_MAP, ADMIN_ORDER_STATUS_LABELS } from '@doublea/shared';
import { formatCurrency } from '@/utils/format';
import { getOrderMarkerColor } from '@/utils/dashboard';
import 'leaflet/dist/leaflet.css';

type LebanonOrdersMapProps = {
  orders: DashboardMapOrder[];
  withoutCoordinates: number;
};

function LebanonBounds() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(
      L.latLngBounds(
        L.latLng(LEBANON_MAP.boundsSouthWest[0], LEBANON_MAP.boundsSouthWest[1]),
        L.latLng(LEBANON_MAP.boundsNorthEast[0], LEBANON_MAP.boundsNorthEast[1]),
      ),
    );
    map.setMinZoom(7);
  }, [map]);
  return null;
}

function createIcon(status: string) {
  const color = getOrderMarkerColor(status);
  return L.divIcon({
    className: 'dash-map-marker-wrap',
    html: `<span class="dash-map-marker" style="background:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function popupHtml(order: DashboardMapOrder): string {
  const status = ADMIN_ORDER_STATUS_LABELS[order.status] ?? order.status;
  const city = order.addressCity ? `<div style="color:#6B4A2D;font-size:12px">${order.addressCity}</div>` : '';
  const driver = order.deliveryAgentName ? ` · ${order.deliveryAgentName}` : '';
  return `
    <div style="min-width:160px;font-size:13px;line-height:1.4">
      <strong>${order.orderNumber}</strong>
      <div>${order.customerName ?? 'Customer'}</div>
      ${city}
      <div style="margin:6px 0"><span style="font-weight:600">${status}</span></div>
      <div style="font-weight:700">${formatCurrency(order.totalAmount)}</div>
      <div style="color:#6B4A2D;font-size:12px;margin:4px 0">${order.paymentStatus.replace(/_/g, ' ')}${driver}</div>
      <a href="/orders/${order.id}" style="color:#C8102E;font-weight:600;font-size:12px">Open order →</a>
    </div>
  `;
}

const LEGEND = [
  { label: 'To prepare / Ready', color: '#FFD21E' },
  { label: 'Assigned / Accepted', color: '#C8102E' },
  { label: 'Picked up / Out', color: '#7A1020' },
];

export default function LebanonOrdersMap({ orders, withoutCoordinates }: LebanonOrdersMapProps) {
  const center = useMemo(
    () => [LEBANON_MAP.centerLat, LEBANON_MAP.centerLng] as [number, number],
    [],
  );

  return (
    <div className="dash-map-panel">
      <div className="dash-map-panel__header">
        <div>
          <h3 className="dash-map-panel__title">Lebanon order map</h3>
          <p className="dash-map-panel__subtitle">
            {orders.length} active order{orders.length === 1 ? '' : 's'} with coordinates
          </p>
        </div>
        <div className="dash-map-legend">
          {LEGEND.map((item) => (
            <span key={item.label} className="dash-map-legend__item">
              <span className="dash-map-legend__dot" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div className="dash-map-panel__map">
        <MapContainer
          center={center}
          zoom={LEBANON_MAP.defaultZoom}
          scrollWheelZoom
          className="dash-leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LebanonBounds />
          {orders.map((order) => (
            <Marker
              key={order.id}
              position={[order.latitude, order.longitude]}
              icon={createIcon(order.status)}
              eventHandlers={{
                add: (e: L.LeafletEvent) => {
                  (e.target as L.Marker).bindPopup(popupHtml(order));
                },
              }}
            />
          ))}
        </MapContainer>
      </div>
      {withoutCoordinates > 0 ? (
        <p className="dash-map-panel__note">
          {withoutCoordinates} active order{withoutCoordinates === 1 ? '' : 's'} do not have map coordinates yet.
        </p>
      ) : null}
    </div>
  );
}
