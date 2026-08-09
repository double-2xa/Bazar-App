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

function DashboardSectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="dash-page-section__header">
      <span className="dash-page-section__eyebrow">{eyebrow}</span>
      <h2 id={id}>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((forceRefresh = false) => {
    setLoading(true);
    setError('');
    api
      .get<DashboardData>('/admin/dashboard', {
        params: forceRefresh ? { refresh: true } : undefined,
      })
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
        onRefresh={() => load(true)}
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

      <section className="dash-page-section" aria-labelledby="dashboard-live-operations">
        <DashboardSectionHeading
          id="dashboard-live-operations"
          eyebrow="Live monitoring"
          title="Operations requiring attention"
          description="Start here to see urgent work, delivery movement and outstanding cash collection."
        />
        <div className="dash-command-grid">
          <AttentionPanel attention={attentionItems} summary={summary} />
          <CodSummaryPanel summary={summary} cashOrderCount={attentionItems.cashToCollect} />
        </div>
        <div className="dash-subsection-heading">
          <div>
            <h3>Orders & delivery</h3>
            <p>Every card opens the relevant operational view.</p>
          </div>
        </div>
        <div className="dash-widgets-row dash-widgets-row--operations">
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
            title="Active drivers"
            value={summary.activeDeliveryAgentsCount}
            href="/delivery-agents"
            compact
          />
        </div>
      </section>

      <section className="dash-page-section" aria-labelledby="dashboard-network-title">
        <DashboardSectionHeading
          id="dashboard-network-title"
          eyebrow="Network view"
          title="Geography & performance"
          description="Monitor where active orders are located and how order volume is moving over time."
        />
        <div className="dash-main-grid">
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
          </div>
        </div>
      </section>

      <section className="dash-page-section" aria-labelledby="dashboard-activity-title">
        <DashboardSectionHeading
          id="dashboard-activity-title"
          eyebrow="Activity"
          title="Current workload"
          description="Recent customer activity alongside the fulfillment pipeline and driver capacity."
        />
        <div className="dash-activity-grid">
          <RecentOrdersPanel orders={data.recentOrders} />
          <div className="dash-activity-grid__side">
            <DeliveryPipelinePanel pipeline={data.deliveryPipeline} />
            <BusyDriversPanel drivers={data.busyDrivers} />
          </div>
        </div>
      </section>

      <section className="dash-page-section" aria-labelledby="dashboard-business-title">
        <DashboardSectionHeading
          id="dashboard-business-title"
          eyebrow="Business health"
          title="Catalog & accounts"
          description="Stock health, customer accounts and wholesale onboarding in one structured area."
        />
        <div className="dash-overview-groups">
          <article className="dash-overview-group">
            <div className="dash-subsection-heading">
              <div><h3>Inventory</h3><p>Catalog stock health</p></div>
            </div>
            <div className="dash-widgets-row dash-widgets-row--inventory">
              <DashboardWidget title={ADMIN_OPS_LABELS.inStock} value={summary.inStockProductsCount} href="/products" tone="success" compact />
              <DashboardWidget title={ADMIN_OPS_LABELS.soldOut} value={summary.soldOutProductsCount} href="/products" tone={summary.soldOutProductsCount > 0 ? 'danger' : 'default'} compact />
              <DashboardWidget title={ADMIN_OPS_LABELS.lowStock} value={summary.lowStockProductsCount} href="/products" tone={summary.lowStockProductsCount > 0 ? 'danger' : 'default'} compact />
              <DashboardWidget title="Total products" value={summary.totalProducts} href="/products" compact />
            </div>
          </article>
          <article className="dash-overview-group">
            <div className="dash-subsection-heading">
              <div><h3>Accounts</h3><p>Customers and wholesale requests</p></div>
            </div>
            <div className="dash-widgets-row dash-widgets-row--accounts">
              <DashboardWidget title={ADMIN_OPS_LABELS.registeredUsers} value={summary.totalUsers} href="/users?status=active" compact />
              <DashboardWidget title={ADMIN_OPS_LABELS.registeredCompanies} value={summary.totalCompanies} href="/companies?status=active" compact />
              <DashboardWidget title={ADMIN_OPS_LABELS.waitingApproval} value={summary.pendingCompanyApprovalsCount} href="/companies?status=pending" tone={summary.pendingCompanyApprovalsCount > 0 ? 'attention' : 'default'} compact />
            </div>
          </article>
        </div>
        <TopProductsPanel topProducts={data.topProducts} lowStockProducts={data.lowStockProducts} />
        <div className="dash-business-detail-grid">
          <PendingCompaniesPanel companies={data.pendingCompanies} onChanged={() => load(true)} />
          <OrdersByCityPanel cities={data.ordersByCity} />
        </div>
      </section>
    </div>
  );
}
