'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/services/api';
import AccountEditorDialog, { AccountRecord, AccountRole } from '@/components/accounts/AccountEditorDialog';

type UserTab = 'pending' | 'rejected' | 'active' | 'inactive';

type CompanyProfile = {
  id: string;
  companyName: string;
  status: string;
  contactPerson?: string;
  companyPhone?: string | null;
  vatNumber?: string;
  businessAddress?: string;
};

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: AccountRole;
  isActive: boolean;
  phone?: string | null;
  companyProfile?: CompanyProfile | null;
};

const TABS: { id: UserTab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

export default function UsersPage() {
  const [tab, setTab] = useState<UserTab>('active');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [counts, setCounts] = useState<Record<UserTab, number>>({
    pending: 0,
    rejected: 0,
    active: 0,
    inactive: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorAccount, setEditorAccount] = useState<AccountRecord | null | undefined>(undefined);

  const loadCounts = useCallback(async () => {
    const entries = await Promise.all(
      TABS.map(async (t) => {
        const r = await api.get('/admin/users', { params: { limit: 1, status: t.id } });
        return [t.id, r.data.total as number] as const;
      }),
    );
    setCounts(Object.fromEntries(entries) as Record<UserTab, number>);
  }, []);

  const load = useCallback(async () => {
    const r = await api.get('/admin/users', { params: { limit: 50, status: tab } });
    setUsers(r.data.data);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const refresh = async () => {
    await Promise.all([load(), loadCounts()]);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    setBusyId(id);
    try {
      await api.patch(`/admin/users/${id}/${isActive ? 'deactivate' : 'activate'}`);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const actCompany = async (companyProfileId: string, action: 'approve' | 'reject') => {
    setBusyId(companyProfileId);
    try {
      await api.patch(`/admin/company-accounts/${companyProfileId}/${action}`);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/admin/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      await refresh();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete user';
      setError(typeof message === 'string' ? message : 'Failed to delete user');
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
        'Failed to remove rejected users';
      setError(typeof message === 'string' ? message : 'Failed to remove rejected users');
    } finally {
      setDeleting(false);
    }
  };

  const statusBadge = (u: UserRow) => {
    if (tab === 'pending') return <span className="badge badge-attention">Pending</span>;
    if (tab === 'rejected') return <span className="badge badge-danger">Rejected</span>;
    return (
      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
        {u.isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <div>
      <div className="account-page-header">
        <div><h1>Users</h1><p>Create accounts, assign roles, and manage access.</p></div>
        <button type="button" className="btn btn-primary" onClick={() => setEditorAccount(null)}>＋ Create account</button>
      </div>
      <div className="account-tabs-row">
        <div className="dash-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`dash-tabs__btn${tab === t.id ? ' dash-tabs__btn--active' : ''}`}
              onClick={() => setTab(t.id)}
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
          {tab === 'pending' && 'Wholesale company signups waiting for approval.'}
          {tab === 'rejected' && 'Wholesale applications that were not approved.'}
          {tab === 'active' && 'Users who can sign in and use the app.'}
          {tab === 'inactive' && 'Deactivated accounts (excluding pending/rejected company requests).'}
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
              <th>Name</th>
              <th>Email</th>
              {(tab === 'pending' || tab === 'rejected') && <th>Company</th>}
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
                  No users in this tab.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.fullName}</td>
                  <td>{u.email}</td>
                  {(tab === 'pending' || tab === 'rejected') && (
                    <td>
                      <div style={{ fontWeight: 500 }}>{u.companyProfile?.companyName || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {u.companyProfile?.contactPerson}
                        {u.companyProfile?.companyPhone ? ` · ${u.companyProfile.companyPhone}` : ''}
                      </div>
                    </td>
                  )}
                  <td>
                    <span className="badge badge-info">{u.role.replace(/_/g, ' ')}</span>
                  </td>
                  <td>{statusBadge(u)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => setEditorAccount(u as AccountRecord)}
                      >
                        Edit
                      </button>
                      {tab === 'pending' && u.companyProfile?.id ? (
                        <>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 12px', fontSize: 12 }}
                            disabled={busyId === u.companyProfile.id}
                            onClick={() => actCompany(u.companyProfile!.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 12px', fontSize: 12 }}
                            disabled={busyId === u.companyProfile.id}
                            onClick={() => actCompany(u.companyProfile!.id, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}

                      {(tab === 'active' || tab === 'inactive') && (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 12px', fontSize: 12 }}
                          disabled={busyId === u.id}
                          onClick={() => toggleActive(u.id, u.isActive)}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}

                      {(tab === 'rejected' || tab === 'active' || tab === 'inactive') &&
                      u.role !== 'admin' ? (
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 12px', fontSize: 12 }}
                          onClick={() => {
                            setError(null);
                            setDeleteTarget(u);
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
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Delete user?</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 8 }}>
              This permanently removes{' '}
              <strong style={{ color: 'var(--text)' }}>{deleteTarget.fullName}</strong> (
              {deleteTarget.email}). This cannot be undone.
            </p>
            {error ? (
              <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 16 }}>{error}</p>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
                Users with order history cannot be deleted — deactivate them instead.
              </p>
            )}
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
                {deleting ? 'Deleting…' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {removeAllOpen ? (
        <div className="modal-overlay" onClick={() => !deleting && setRemoveAllOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Remove all rejected users?</h2>
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

      {editorAccount !== undefined ? (
        <AccountEditorDialog
          account={editorAccount}
          onClose={() => setEditorAccount(undefined)}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}
