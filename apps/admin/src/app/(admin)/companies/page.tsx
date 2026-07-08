'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Record<string, unknown>[]>([]);

  const load = () => api.get('/admin/company-accounts').then((r) => setCompanies(r.data));

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => { await api.patch(`/admin/company-accounts/${id}/approve`); load(); };
  const reject = async (id: string) => { await api.patch(`/admin/company-accounts/${id}/reject`); load(); };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Company Accounts</h1>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Company</th><th>VAT</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id as string}>
                <td>
                  <div style={{ fontWeight: 500 }}>{c.companyName as string}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{(c.user as { email: string })?.email}</div>
                </td>
                <td>{c.vatNumber as string}</td>
                <td>{c.contactPerson as string}</td>
                <td>
                  <span className={`badge ${c.status === 'approved' ? 'badge-success' : c.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                    {c.status as string}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: 8 }}>
                  {c.status === 'pending' && (
                    <>
                      <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => approve(c.id as string)}>Approve</button>
                      <button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => reject(c.id as string)}>Reject</button>
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
