'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DashboardPendingCompany } from '@doublea/shared';
import api from '@/services/api';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { formatDateTime } from '@/utils/format';
import SectionHeader from './SectionHeader';

type PendingCompaniesPanelProps = {
  companies: DashboardPendingCompany[];
  onChanged?: () => void;
};

export default function PendingCompaniesPanel({ companies, onChanged }: PendingCompaniesPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      await api.patch(`/admin/company-accounts/${id}/${action}`);
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="dash-panel">
      <SectionHeader
        title="Pending companies"
        subtitle="Wholesale accounts awaiting approval"
        action={
          <Link href="/companies?status=pending" className="dash-panel__link">
            Review all
          </Link>
        }
      />
      {companies.length === 0 ? (
        <EmptyState message="No companies waiting for approval." />
      ) : (
        <ul className="dash-list">
          {companies.map((c) => (
            <li key={c.id} className="dash-list__item" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="dash-list__primary">{c.companyName}</div>
                <div className="dash-list__secondary">
                  {c.contactPerson} · {formatDateTime(c.createdAt)}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '4px 12px', fontSize: 12 }}
                    disabled={busyId === c.id}
                    onClick={() => act(c.id, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '4px 12px', fontSize: 12 }}
                    disabled={busyId === c.id}
                    onClick={() => act(c.id, 'reject')}
                  >
                    Reject
                  </button>
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
