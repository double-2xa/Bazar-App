import Link from 'next/link';
import type { DashboardPendingCompany } from '@doublea/shared';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { formatDateTime } from '@/utils/format';
import SectionHeader from './SectionHeader';

type PendingCompaniesPanelProps = {
  companies: DashboardPendingCompany[];
};

export default function PendingCompaniesPanel({ companies }: PendingCompaniesPanelProps) {
  return (
    <div className="dash-panel">
      <SectionHeader
        title="Pending companies"
        subtitle="Wholesale accounts awaiting approval"
        action={
          <Link href="/companies" className="dash-panel__link">
            Review all
          </Link>
        }
      />
      {companies.length === 0 ? (
        <EmptyState message="No companies waiting for approval." />
      ) : (
        <ul className="dash-list">
          {companies.map((c) => (
            <li key={c.id} className="dash-list__item">
              <div>
                <div className="dash-list__primary">{c.companyName}</div>
                <div className="dash-list__secondary">
                  {c.contactPerson} · {formatDateTime(c.createdAt)}
                </div>
              </div>
              <StatusBadge status={c.status ?? 'pending'} kind="company" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
