'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState({ code: '', type: 'percentage', value: '', minOrderAmount: '0', startsAt: '', expiresAt: '' });

  const load = () => api.get('/admin/coupons').then((r) => setCoupons(r.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/admin/coupons', { ...form, value: parseFloat(form.value), minOrderAmount: parseFloat(form.minOrderAmount) });
    setForm({ code: '', type: 'percentage', value: '', minOrderAmount: '0', startsAt: '', expiresAt: '' });
    load();
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Coupons</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Create Coupon</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group"><label>Code</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
            <div className="form-group"><label>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></div>
            <div className="form-group"><label>Value</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></div>
            <div className="form-group"><label>Starts At</label><input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: new Date(e.target.value).toISOString() })} required /></div>
            <div className="form-group"><label>Expires At</label><input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: new Date(e.target.value).toISOString() })} required /></div>
            <button type="submit" className="btn btn-primary">Create</button>
          </form>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Active</th></tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id as string}>
                  <td style={{ fontWeight: 600 }}>{c.code as string}</td>
                  <td>{c.type as string}</td>
                  <td>{c.type === 'percentage' ? `${c.value}%` : `$${c.value}`}</td>
                  <td><span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>{c.isActive ? 'Yes' : 'No'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
