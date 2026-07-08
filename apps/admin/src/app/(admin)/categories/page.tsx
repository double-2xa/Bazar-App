'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '', imageUrl: '' });

  const load = () => api.get('/categories', { params: { all: true } }).then((r) => setCategories(r.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/categories', form);
    setForm({ name: '', slug: '', description: '', imageUrl: '' });
    load();
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Categories</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Add Category</h3>
          <form onSubmit={handleCreate}>
            {(['name', 'slug', 'description', 'imageUrl'] as const).map((f) => (
              <div key={f} className="form-group">
                <label>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                <input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required={f === 'name' || f === 'slug'} />
              </div>
            ))}
            <button type="submit" className="btn btn-primary">Create</button>
          </form>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Name</th><th>Slug</th><th>Status</th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id as string}>
                  <td style={{ fontWeight: 500 }}>{c.name as string}</td>
                  <td>{c.slug as string}</td>
                  <td><span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
