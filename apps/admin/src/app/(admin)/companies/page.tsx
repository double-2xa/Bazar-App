'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/services/api';

type CompanyRow = {
  id: string;
  companyName: string;
  vatNumber: string;
  contactPerson: string;
  companyPhone?: string | null;
  status: string;
  user?: { email: string; phone?: string | null };
};

function CompaniesPageContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);

  const load = () =>
    api
      .get('/admin/company-accounts', {
        params: statusFilter ? { status: statusFilter } : undefined,
      })
      .then((r) => setCompanies(r.data));

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || '');
  }, [searchParams]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const approve = async (id: string) => {
    await api.patch(`/admin/company-accounts/${id}/approve`);
    load();
  };
  const reject = async (id: string) => {
    await api.patch(`/admin/company-accounts/${id}/reject`);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Company Accounts</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 14 }}>
            Approve pending wholesale signups so the company can access the store. Rejected accounts stay locked out.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>VAT</th>
              <th>Contact</th>
              <th>Phone / WhatsApp</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{c.companyName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.user?.email}</div>
                </td>
                <td>{c.vatNumber}</td>
                <td>{c.contactPerson}</td>
                <td>{c.companyPhone || c.user?.phone || '—'}</td>
                <td>
                  <span
                    className={`badge ${
                      c.status === 'approved'
                        ? 'badge-success'
                        : c.status === 'pending'
                          ? 'badge-warning'
                          : 'badge-danger'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: 8 }}>
                  {c.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => approve(c.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => reject(c.id)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: 'var(--muted)' }}>Loading companies...</p>}>
      <CompaniesPageContent />
    </Suspense>
  );
}
