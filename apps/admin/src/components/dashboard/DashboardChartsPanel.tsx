'use client';

import dynamic from 'next/dynamic';
import type { DashboardOrderStatusBreakdown, DashboardSalesTrendDay } from '@doublea/shared';
import LoadingState from '@/components/LoadingState';

const SalesTrendChart = dynamic(() => import('./SalesTrendChart'), {
  ssr: false,
  loading: () => <LoadingState message="Loading sales chart…" />,
});

const OrderStatusChart = dynamic(() => import('./OrderStatusChart'), {
  ssr: false,
  loading: () => <LoadingState message="Loading status chart…" />,
});

type DashboardChartsPanelProps = {
  days7: DashboardSalesTrendDay[];
  days30: DashboardSalesTrendDay[];
  breakdown: DashboardOrderStatusBreakdown;
};

export default function DashboardChartsPanel({ days7, days30, breakdown }: DashboardChartsPanelProps) {
  return (
    <>
      <SalesTrendChart days7={days7} days30={days30} />
      <OrderStatusChart breakdown={breakdown} />
    </>
  );
}
