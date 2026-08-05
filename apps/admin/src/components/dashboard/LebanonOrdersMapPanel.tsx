'use client';

import dynamic from 'next/dynamic';
import type { DashboardMapOrder } from '@doublea/shared';
import LoadingState from '@/components/LoadingState';

const LebanonOrdersMap = dynamic(() => import('./LebanonOrdersMap'), {
  ssr: false,
  loading: () => <LoadingState message="Loading Lebanon map…" />,
});

type LebanonOrdersMapPanelProps = {
  orders: DashboardMapOrder[];
  withoutCoordinates: number;
};

export default function LebanonOrdersMapPanel(props: LebanonOrdersMapPanelProps) {
  return <LebanonOrdersMap {...props} />;
}
