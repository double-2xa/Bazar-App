'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import type { Product } from '@doublea/shared';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', normalPrice: '', companyPrice: '', stockQuantity: '', sku: '', categoryId: '', brand: '', imageUrl: '' });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const load = () => {
    api.get('/products', { params: { limit: 50, search: search || undefined } }).then((r) => setProducts(r.data.data));
    api.get('/categories', { params: { all: true } }).then((r) => setCategories(r.data));
  };

  useEffect(() => { load(); }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/products', {
      ...form,
      normalPrice: parseFloat(form.normalPrice),
      companyPrice: parseFloat(form.companyPrice),
      stockQuantity: parseInt(form.stockQuantity),
    });
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Products</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Product</button>
      </div>

      <input
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 300, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Normal Price</th>
              <th>Company Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />}
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.brand}</div>
                    </div>
                  </div>
                </td>
                <td>{p.sku}</td>
                <td>${p.normalPrice.toFixed(2)}</td>
                <td>${p.companyPrice.toFixed(2)}</td>
                <td>{p.stockQuantity}</td>
                <td>
                  <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleDelete(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 20 }}>Add Product</h2>
            <form onSubmit={handleCreate}>
              {['name', 'slug', 'sku', 'brand', 'description', 'imageUrl'].map((f) => (
                <div key={f} className="form-group">
                  <label>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                  <input value={(form as Record<string, string>)[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required={f !== 'brand' && f !== 'imageUrl'} />
                </div>
              ))}
              <div className="form-group">
                <label>Category</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {['normalPrice', 'companyPrice', 'stockQuantity'].map((f) => (
                <div key={f} className="form-group">
                  <label>{f.replace(/([A-Z])/g, ' $1')}</label>
                  <input type="number" step="0.01" value={(form as Record<string, string>)[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
