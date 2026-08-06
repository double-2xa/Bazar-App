'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DashboardData } from '@doublea/shared';
import { ADMIN_OPS_LABELS } from '@doublea/shared';
import api from '@/services/api';
import LoadingState from '@/components/LoadingState';
import ErrorBanner from '@/components/ErrorBanner';
import DashboardHero, { DashboardWidget } from '@/components/dashboard/DashboardHero';
import LebanonOrdersMapPanel from '@/components/dashboard/LebanonOrdersMapPanel';
import DashboardChartsPanel from '@/components/dashboard/DashboardChartsPanel';
import DeliveryPipelinePanel from '@/components/dashboard/DeliveryPipeline';
import RecentOrdersPanel from '@/components/dashboard/RecentOrdersPanel';
import BusyDriversPanel from '@/components/dashboard/BusyDriversPanel';
import TopProductsPanel from '@/components/dashboard/TopProductsPanel';
import PendingCompaniesPanel from '@/components/dashboard/PendingCompaniesPanel';
import AttentionPanel from '@/components/dashboard/AttentionPanel';
import CodSummaryPanel, { OrdersByCityPanel } from '@/components/dashboard/CodSummaryPanel';
import { formatCurrency } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/orderDelivery';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get<DashboardData>('/admin/dashboard')
      .then((r) => setData(r.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          setError(getApiErrorMessage(err, 'Failed to load dashboard.'));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="dash-v3">
        <LoadingState message="Loading Lebanon operations dashboard…" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dash-v3">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
  }

  if (!data) return null;

  const { summary, attentionItems } = data;

  return (
    <div className="dash-v3">
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      <DashboardHero
        onRefresh={load}
        refreshing={loading}
        kpis={[
          { label: 'Today’s orders', value: summary.todayOrders },
          {
            label: 'Today’s revenue',
            value: formatCurrency(summary.todayRevenue),
            tone: 'success',
          },
          {
            label: 'In delivery',
            value: summary.inDeliveryOrdersCount,
            tone: summary.inDeliveryOrdersCount > 0 ? 'attention' : 'default',
          },
          {
            label: 'Cash to collect',
            value: formatCurrency(summary.codUnpaidAmount),
            tone: summary.codUnpaidAmount > 0 ? 'attention' : 'default',
          },
        ]}
      />

      <section className="dash-widgets-row" aria-label="Quick actions">
        <DashboardWidget
          title={ADMIN_OPS_LABELS.needsDriver}
          value={summary.unassignedOrdersCount}
          href="/orders?deliveryFilter=unassigned"
          tone={summary.unassignedOrdersCount > 0 ? 'attention' : 'default'}
          compact
        />
        <DashboardWidget
          title={ADMIN_OPS_LABELS.toPrepare}
          value={summary.pendingOrdersCount}
          href="/orders?status=pending"
          tone={summary.pendingOrdersCount > 0 ? 'attention' : 'default'}
          compact
        />
        <DashboardWidget
          title="Ready for driver"
          value={data.deliveryPipeline.readyForDriver}
          href="/orders?deliveryFilter=unassigned"
          compact
        />
        <DashboardWidget
          title="In delivery"
          value={summary.inDeliveryOrdersCount}
          href="/orders?deliveryFilter=in_delivery"
          compact
        />
        <DashboardWidget
          title="Delivered today"
          value={summary.deliveredTodayCount}
          href="/orders?deliveryFilter=delivered"
          tone="success"
          compact
        />
        <DashboardWidget
          title={ADMIN_OPS_LABELS.waitingApproval}
          value={summary.pendingCompanyApprovalsCount}
          href="/companies"
          tone={summary.pendingCompanyApprovalsCount > 0 ? 'attention' : 'default'}
          compact
        />
        <DashboardWidget
          title={ADMIN_OPS_LABELS.lowStock}
          value={summary.lowStockProductsCount}
          href="/products"
          tone={summary.lowStockProductsCount > 0 ? 'danger' : 'default'}
          compact
        />
        <DashboardWidget
          title="Active drivers"
          value={summary.activeDeliveryAgentsCount}
          href="/delivery-agents"
          compact
        />
      </section>

      <section className="dash-main-grid" aria-label="Map and analytics">
        <div className="dash-main-grid__map">
          <LebanonOrdersMapPanel
            orders={data.mapOrders}
            withoutCoordinates={data.mapOrdersWithoutCoordinates}
          />
        </div>
        <div className="dash-main-grid__side">
          <DashboardChartsPanel
            days7={data.salesTrend.days7}
            days30={data.salesTrend.days30}
            breakdown={data.orderStatusBreakdown}
          />
          <DeliveryPipelinePanel pipeline={data.deliveryPipeline} />
        </div>
      </section>

      <section className="dash-panels-grid" aria-label="Operational panels">
        <RecentOrdersPanel orders={data.recentOrders} />
        <BusyDriversPanel drivers={data.busyDrivers} />
        <TopProductsPanel topProducts={data.topProducts} lowStockProducts={data.lowStockProducts} />
        <PendingCompaniesPanel companies={data.pendingCompanies} onChanged={load} />
      </section>

      <section className="dash-deep-grid" aria-label="Deeper operations">
        <AttentionPanel attention={attentionItems} summary={summary} />
        <CodSummaryPanel summary={summary} cashOrderCount={attentionItems.cashToCollect} />
        <OrdersByCityPanel cities={data.ordersByCity} />
      </section>
    </div>
  );
}
