'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';

export default function UsersPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.get('/admin/users', { params: { limit: 50 } }).then((r) => setUsers(r.data.data));
  }, []);

  const toggleActive = async (id: string, isActive: boolean) => {
    await api.patch(`/admin/users/${id}/${isActive ? 'deactivate' : 'activate'}`);
    const r = await api.get('/admin/users', { params: { limit: 50 } });
    setUsers(r.data.data);
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Users</h1>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id as string}>
                <td style={{ fontWeight: 500 }}>{u.fullName as string}</td>
                <td>{u.email as string}</td>
                <td><span className="badge badge-info">{(u.role as string).replace(/_/g, ' ')}</span></td>
                <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => toggleActive(u.id as string, u.isActive as boolean)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
