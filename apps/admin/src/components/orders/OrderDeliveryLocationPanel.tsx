'use client';

import dynamic from 'next/dynamic';

const OrderDeliveryLocationMap = dynamic(() => import('./OrderDeliveryLocationMap'), {
  ssr: false,
  loading: () => <div className="order-location-map__loading">Loading private map…</div>,
});

type OrderDeliveryLocationPanelProps = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  capturedAt: string | null;
};

export default function OrderDeliveryLocationPanel(props: OrderDeliveryLocationPanelProps) {
  return <OrderDeliveryLocationMap {...props} />;
}
