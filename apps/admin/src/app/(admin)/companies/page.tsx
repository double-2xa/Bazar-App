'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/services/api';
import AccountEditorDialog, { AccountRecord } from '@/components/accounts/AccountEditorDialog';

type CompanyTab = 'pending' | 'rejected' | 'active' | 'inactive';

type CompanyRow = {
  id: string;
  companyName: string;
  vatNumber: string;
  businessAddress: string;
  contactPerson: string;
  companyPhone?: string | null;
  status: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
    phone?: string | null;
    isActive?: boolean;
  };
};

const TABS: { id: CompanyTab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

function CompaniesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = (searchParams.get('status') as CompanyTab | null) || 'pending';
  const [tab, setTab] = useState<CompanyTab>(
    TABS.some((t) => t.id === initial) ? initial : 'pending',
  );
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [counts, setCounts] = useState<Record<CompanyTab, number>>({
    pending: 0,
    rejected: 0,
    active: 0,
    inactive: 0,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyRow | null>(null);
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorCompany, setEditorCompany] = useState<CompanyRow | null | undefined>(undefined);

  const loadCounts = useCallback(async () => {
    const entries = await Promise.all(
      TABS.map(async (t) => {
        const r = await api.get('/admin/company-accounts', { params: { status: t.id } });
        return [t.id, (r.data as CompanyRow[]).length] as const;
      }),
    );
    setCounts(Object.fromEntries(entries) as Record<CompanyTab, number>);
  }, []);

  const load = useCallback(async () => {
    const r = await api.get('/admin/company-accounts', { params: { status: tab } });
    setCompanies(r.data);
  }, [tab]);

  useEffect(() => {
    const fromUrl = searchParams.get('status') as CompanyTab | null;
    if (fromUrl && TABS.some((t) => t.id === fromUrl) && fromUrl !== tab) {
      setTab(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const selectTab = (next: CompanyTab) => {
    setTab(next);
    router.replace(`/companies?status=${next}`);
  };

  const refresh = async () => {
    await Promise.all([load(), loadCounts()]);
  };

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await api.patch(`/admin/company-accounts/${id}/approve`);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      await api.patch(`/admin/company-accounts/${id}/reject`);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    setBusyId(userId);
    try {
      await api.patch(`/admin/users/${userId}/${isActive ? 'deactivate' : 'activate'}`);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.user?.id) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/admin/users/${deleteTarget.user.id}`);
      setDeleteTarget(null);
      await refresh();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete company';
      setError(typeof message === 'string' ? message : 'Failed to delete company');
    } finally {
      setDeleting(false);
    }
  };

  const confirmRemoveAllRejected = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.delete('/admin/users/rejected');
      setRemoveAllOpen(false);
      await refresh();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to remove rejected companies';
      setError(typeof message === 'string' ? message : 'Failed to remove rejected companies');
    } finally {
      setDeleting(false);
    }
  };

  const statusBadge = () => {
    if (tab === 'pending') return <span className="badge badge-attention">Pending</span>;
    if (tab === 'rejected') return <span className="badge badge-danger">Rejected</span>;
    if (tab === 'active') return <span className="badge badge-success">Active</span>;
    return <span className="badge badge-danger">Inactive</span>;
  };

  return (
    <div>
      <div className="account-page-header">
        <div><h1>Company Accounts</h1><p>Create and manage approved wholesale accounts.</p></div>
        <button type="button" className="btn btn-primary" onClick={() => setEditorCompany(null)}>＋ Create company</button>
      </div>
      <div className="account-tabs-row">
        <div className="dash-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`dash-tabs__btn${tab === t.id ? ' dash-tabs__btn--active' : ''}`}
              onClick={() => selectTab(t.id)}
            >
              {t.label}
              <span style={{ marginLeft: 6, opacity: 0.7 }}>({counts[t.id]})</span>
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
          {tab === 'pending' && 'Wholesale signups waiting for admin approval.'}
          {tab === 'rejected' && 'Wholesale applications that were not approved.'}
          {tab === 'active' && 'Approved companies that can sign in and use wholesale pricing.'}
          {tab === 'inactive' && 'Approved companies that were deactivated.'}
        </p>
        {tab === 'rejected' && counts.rejected > 0 ? (
          <button
            type="button"
            className="btn btn-danger"
            style={{ padding: '6px 14px', fontSize: 13 }}
            onClick={() => {
              setError(null);
              setRemoveAllOpen(true);
            }}
          >
            Remove all rejected
          </button>
        ) : null}
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
            {companies.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
                  No companies in this tab.
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{c.companyName}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.user?.email}</div>
                  </td>
                  <td>{c.vatNumber}</td>
                  <td>{c.contactPerson}</td>
                  <td>{c.companyPhone || c.user?.phone || '—'}</td>
                  <td>{statusBadge()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {c.user?.id ? (
                        <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setEditorCompany(c)}>Edit</button>
                      ) : null}
                      {tab === 'pending' ? (
                        <>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 12px', fontSize: 12 }}
                            disabled={busyId === c.id}
                            onClick={() => approve(c.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 12px', fontSize: 12 }}
                            disabled={busyId === c.id}
                            onClick={() => reject(c.id)}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}

                      {(tab === 'active' || tab === 'inactive') && c.user?.id ? (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 12px', fontSize: 12 }}
                          disabled={busyId === c.user.id}
                          onClick={() => toggleActive(c.user!.id, tab === 'active')}
                        >
                          {tab === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : null}

                      {tab === 'rejected' && c.user?.id ? (
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 12px', fontSize: 12 }}
                          onClick={() => {
                            setError(null);
                            setDeleteTarget(c);
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget ? (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Delete company?</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 8 }}>
              This permanently removes{' '}
              <strong style={{ color: 'var(--text)' }}>{deleteTarget.companyName}</strong> (
              {deleteTarget.user?.email}). This cannot be undone.
            </p>
            {error ? (
              <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 16 }}>{error}</p>
            ) : null}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {removeAllOpen ? (
        <div className="modal-overlay" onClick={() => !deleting && setRemoveAllOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Remove all rejected companies?</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 8 }}>
              This permanently deletes all <strong style={{ color: 'var(--text)' }}>{counts.rejected}</strong>{' '}
              rejected company account(s). This cannot be undone.
            </p>
            {error ? (
              <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 16 }}>{error}</p>
            ) : null}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={deleting}
                onClick={() => setRemoveAllOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={confirmRemoveAllRejected}
              >
                {deleting ? 'Removing…' : 'Remove all'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editorCompany !== undefined ? (
        <AccountEditorDialog
          fixedRole="company"
          account={editorCompany?.user?.id ? ({
            id: editorCompany.user.id,
            fullName: editorCompany.user.fullName ?? editorCompany.contactPerson,
            email: editorCompany.user.email,
            phone: editorCompany.user.phone,
            role: 'company',
            isActive: editorCompany.user.isActive ?? true,
            companyProfile: {
              companyName: editorCompany.companyName,
              vatNumber: editorCompany.vatNumber,
              businessAddress: editorCompany.businessAddress,
              contactPerson: editorCompany.contactPerson,
              companyPhone: editorCompany.companyPhone ?? '',
            },
          } satisfies AccountRecord) : null}
          onClose={() => setEditorCompany(undefined)}
          onSaved={refresh}
        />
      ) : null}
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
