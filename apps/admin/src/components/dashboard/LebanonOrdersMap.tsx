'use client';

import { useEffect, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
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

type GeoJsonCollection = GeoJSON.FeatureCollection;

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

function FitOrders({ orders }: { orders: DashboardMapOrder[] }) {
  const map = useMap();
  useEffect(() => {
    if (!orders.length) return;
    if (orders.length === 1) {
      map.setView([orders[0].latitude, orders[0].longitude], 12, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(orders.map((o) => [o.latitude, o.longitude] as [number, number]));
    map.fitBounds(bounds.pad(0.2), { maxZoom: 12 });
  }, [map, orders]);
  return null;
}

function createIcon(status: string, precision: DashboardMapOrder['locationPrecision']) {
  const color = getOrderMarkerColor(status);
  if (precision === 'settlement') {
    return L.divIcon({
      className: 'dash-map-marker-wrap',
      html: `<span class="dash-map-marker dash-map-marker--city" style="border-color:${color}"><span class="dash-map-marker__inner" style="background:${color}"></span></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }
  return L.divIcon({
    className: 'dash-map-marker-wrap',
    html: `<span class="dash-map-marker dash-map-marker--exact" style="background:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function popupHtml(order: DashboardMapOrder): string {
  const status = ADMIN_ORDER_STATUS_LABELS[order.status] ?? order.status;
  const place = [order.addressCity, order.addressDistrict, order.addressGovernorate]
    .filter(Boolean)
    .join(' · ');
  const city = place ? `<div style="color:#6B4A2D;font-size:12px">${place}</div>` : '';
  const driver = order.deliveryAgentName ? ` · ${order.deliveryAgentName}` : '';
  const precisionLabel =
    order.locationPrecision === 'exact'
      ? 'Exact GPS pin'
      : 'City / settlement (basemap)';
  return `
    <div style="min-width:170px;font-size:13px;line-height:1.4">
      <strong>${order.orderNumber}</strong>
      <div>${order.customerName ?? 'Customer'}</div>
      ${city}
      <div style="margin:6px 0"><span style="font-weight:600">${status}</span></div>
      <div style="font-weight:700">${formatCurrency(order.totalAmount)}</div>
      <div style="color:#6B4A2D;font-size:12px;margin:4px 0">${order.paymentStatus.replace(/_/g, ' ')}${driver}</div>
      <div style="color:#8B4513;font-size:11px;margin:6px 0 4px">${precisionLabel}</div>
      <a href="/orders/${order.id}" style="color:#C8102E;font-weight:600;font-size:12px">Open order →</a>
    </div>
  `;
}

const LEGEND = [
  { label: 'To prepare / Ready', color: '#FFD21E' },
  { label: 'Assigned / Accepted', color: '#C8102E' },
  { label: 'Picked up / Out', color: '#7A1020' },
];

const governorateStyle: L.PathOptions = {
  color: '#8B4513',
  weight: 1.5,
  fillColor: '#F5E6D3',
  fillOpacity: 0.25,
};

const districtStyle: L.PathOptions = {
  color: '#C8102E',
  weight: 0.8,
  dashArray: '4 3',
  fill: false,
  fillOpacity: 0,
};

export default function LebanonOrdersMap({ orders, withoutCoordinates }: LebanonOrdersMapProps) {
  const center = useMemo(
    () => [LEBANON_MAP.centerLat, LEBANON_MAP.centerLng] as [number, number],
    [],
  );
  const [governorates, setGovernorates] = useState<GeoJsonCollection | null>(null);
  const [districts, setDistricts] = useState<GeoJsonCollection | null>(null);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showGovernorates, setShowGovernorates] = useState(true);
  const [showExact, setShowExact] = useState(true);
  const [showCity, setShowCity] = useState(true);

  const exactCount = orders.filter((o) => o.locationPrecision === 'exact').length;
  const cityCount = orders.filter((o) => o.locationPrecision === 'settlement').length;
  const visibleOrders = orders.filter((o) =>
    o.locationPrecision === 'exact' ? showExact : showCity,
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/geo/lebanon-governorates.geojson').then((r) => r.json()),
      fetch('/geo/lebanon-districts.geojson').then((r) => r.json()),
    ])
      .then(([gov, dist]) => {
        if (cancelled) return;
        setGovernorates(gov);
        setDistricts(dist);
      })
      .catch(() => {
        /* basemap optional if assets missing */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="dash-map-panel">
      <div className="dash-map-panel__header">
        <div>
          <h3 className="dash-map-panel__title">Lebanon order map</h3>
          <p className="dash-map-panel__subtitle">
            {exactCount} exact GPS · {cityCount} city / settlement
            {orders.length ? ` · ${orders.length} plotted` : ''}
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
      <div className="dash-map-layer-toggles">
        <label>
          <input
            type="checkbox"
            checked={showGovernorates}
            onChange={(e) => setShowGovernorates(e.target.checked)}
          />
          Governorates
        </label>
        <label>
          <input
            type="checkbox"
            checked={showDistricts}
            onChange={(e) => setShowDistricts(e.target.checked)}
          />
          Districts
        </label>
        <label>
          <input
            type="checkbox"
            checked={showExact}
            onChange={(e) => setShowExact(e.target.checked)}
          />
          Exact GPS
        </label>
        <label>
          <input
            type="checkbox"
            checked={showCity}
            onChange={(e) => setShowCity(e.target.checked)}
          />
          City pins
        </label>
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
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LebanonBounds />
          <FitOrders orders={visibleOrders} />
          {showGovernorates && governorates ? (
            <GeoJSON
              data={governorates}
              style={() => governorateStyle}
              onEachFeature={(feature: GeoJSON.Feature, layer: L.Layer) => {
                const name = feature.properties?.adm1_name as string | undefined;
                const nameAr = feature.properties?.adm1_name1 as string | undefined;
                if (name) {
                  layer.bindTooltip(nameAr ? `${name} (${nameAr})` : name, { sticky: true });
                }
              }}
            />
          ) : null}
          {showDistricts && districts ? (
            <GeoJSON
              data={districts}
              style={() => districtStyle}
              onEachFeature={(feature: GeoJSON.Feature, layer: L.Layer) => {
                const name = feature.properties?.adm2_name as string | undefined;
                const gov = feature.properties?.adm1_name as string | undefined;
                if (name) {
                  layer.bindTooltip(gov ? `${name} · ${gov}` : name, { sticky: true });
                }
              }}
            />
          ) : null}
          {visibleOrders.map((order) => (
            <Marker
              key={order.id}
              position={[order.latitude, order.longitude]}
              icon={createIcon(order.status, order.locationPrecision)}
              eventHandlers={{
                add: (e: L.LeafletEvent) => {
                  (e.target as L.Marker).bindPopup(popupHtml(order));
                },
              }}
            />
          ))}
        </MapContainer>
      </div>
      <div className="dash-map-precision-legend">
        <span>
          <span className="dash-map-marker dash-map-marker--exact" style={{ background: '#C8102E' }} />
          Exact GPS
        </span>
        <span>
          <span className="dash-map-marker dash-map-marker--city" style={{ borderColor: '#C8102E' }}>
            <span className="dash-map-marker__inner" style={{ background: '#C8102E' }} />
          </span>
          City / settlement (approximate)
        </span>
      </div>
      {withoutCoordinates > 0 ? (
        <p className="dash-map-panel__note">
          {withoutCoordinates} active order{withoutCoordinates === 1 ? '' : 's'} could not be placed
          on the map (no GPS and no matching Lebanon city).
        </p>
      ) : null}
    </div>
  );
}
