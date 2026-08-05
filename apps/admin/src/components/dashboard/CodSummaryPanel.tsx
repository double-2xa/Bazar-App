import type { DashboardSummary, DashboardOrdersByCity } from '@doublea/shared';
import { formatCurrency } from '@/utils/format';
import SectionHeader from './SectionHeader';

type CodSummaryPanelProps = {
  summary: DashboardSummary;
  cashOrderCount: number;
};

export default function CodSummaryPanel({ summary, cashOrderCount }: CodSummaryPanelProps) {
  return (
    <div className="dash-panel dash-panel--cod">
      <SectionHeader title="Cash on delivery" subtitle="Outstanding COD to collect" />
      <div className="dash-cod-summary">
        <div className="dash-cod-summary__amount">{formatCurrency(summary.codUnpaidAmount)}</div>
        <p className="dash-cod-summary__meta">
          {cashOrderCount} unpaid COD order{cashOrderCount === 1 ? '' : 's'} (not cancelled)
        </p>
      </div>
    </div>
  );
}

type OrdersByCityPanelProps = {
  cities: DashboardOrdersByCity[];
};

export function OrdersByCityPanel({ cities }: OrdersByCityPanelProps) {
  if (cities.length === 0) return null;
  return (
    <div className="dash-panel">
      <SectionHeader title="Orders by city" subtitle="Active orders across Lebanon" />
      <ul className="dash-list">
        {cities.map((c) => (
          <li key={c.city} className="dash-list__item">
            <span className="dash-list__primary">{c.city}</span>
            <span className="dash-list__badge">{c.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
