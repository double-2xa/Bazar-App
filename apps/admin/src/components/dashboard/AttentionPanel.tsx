import Link from 'next/link';
import type { DashboardAttentionItems, DashboardSummary } from '@doublea/shared';
import { ADMIN_OPS_LABELS } from '@doublea/shared';
import { formatCurrency } from '@/utils/format';
import SectionHeader from './SectionHeader';

type AttentionPanelProps = {
  attention: DashboardAttentionItems;
  summary: DashboardSummary;
};

export default function AttentionPanel({ attention, summary }: AttentionPanelProps) {
  const items = [
    {
      label: ADMIN_OPS_LABELS.needsDriver,
      value: attention.needsDriver,
      href: '/orders?deliveryFilter=unassigned',
      show: attention.needsDriver > 0,
    },
    {
      label: ADMIN_OPS_LABELS.toPrepare,
      value: attention.toPrepare,
      href: '/orders?status=pending',
      show: attention.toPrepare > 0,
    },
    {
      label: ADMIN_OPS_LABELS.waitingApproval,
      value: attention.pendingCompanies,
      href: '/companies',
      show: attention.pendingCompanies > 0,
    },
    {
      label: ADMIN_OPS_LABELS.lowStock,
      value: attention.lowStock,
      href: '/products',
      show: attention.lowStock > 0,
    },
    {
      label: ADMIN_OPS_LABELS.cashToCollect,
      value: `${attention.cashToCollect} orders · ${formatCurrency(summary.codUnpaidAmount)}`,
      href: '/orders',
      show: attention.cashToCollect > 0,
    },
  ].filter((i) => i.show);

  return (
    <div className="dash-panel dash-panel--attention">
      <SectionHeader title="Needs attention now" subtitle="Prioritized operational alerts" />
      {items.length === 0 ? (
        <p className="dash-attention-clear">All clear — no urgent items right now.</p>
      ) : (
        <ul className="dash-attention-list">
          {items.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="dash-attention-list__item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
