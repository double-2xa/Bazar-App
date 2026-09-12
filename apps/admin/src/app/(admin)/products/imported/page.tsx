'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Category } from '@doublea/shared';
import api from '@/services/api';
import { getApiErrorMessage } from '@/utils/orderDelivery';

type ImportedRow = {
  id: string; excelRow: number; barcode: string | null; nameAr: string | null; nameEn: string | null;
  normalPrice: number | null; companyPrice: number | null; stockQuantity: number | null; storedImageUrl: string | null;
  categoryId: string | null; subcategoryId: string | null; status: string; issues: string[] | null; action: string;
  batch: { originalName: string };
};
type Response = { data: ImportedRow[]; total: number; totalPages: number };
type EditForm = { nameAr: string; nameEn: string; normalPrice: string; companyPrice: string; stockQuantity: string };

export default function ImportedProductsPage() {
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState('imported');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [editing, setEditing] = useState<ImportedRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ nameAr: '', nameEn: '', normalPrice: '', companyPrice: '', stockQuantity: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Response>('/product-imports/imported', { params: { page, limit: 50, status, search: search || undefined } });
      setRows(response.data.data); setTotal(response.data.total); setTotalPages(response.data.totalPages || 1); setSelected([]);
    } catch (err) { setError(getApiErrorMessage(err, 'Could not load imported products.')); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 250); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { api.get<Category[]>('/categories', { params: { all: true } }).then((response) => setCategories(response.data)).catch(() => undefined); }, []);

  const updateCategory = async (row: ImportedRow, categoryId: string, subcategoryId?: string) => {
    try {
      await api.patch(`/product-imports/rows/${row.id}`, { categoryId: categoryId || null, subcategoryId: subcategoryId || null });
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, categoryId: categoryId || null, subcategoryId: subcategoryId || null } : item));
    } catch (err) { setError(getApiErrorMessage(err, 'Could not assign the category.')); }
  };

  const openEdit = (row: ImportedRow) => {
    setEditing(row); setError('');
    setEditForm({ nameAr: row.nameAr || '', nameEn: row.nameEn || '', normalPrice: row.normalPrice === null ? '' : String(row.normalPrice), companyPrice: row.companyPrice === null ? '' : String(row.companyPrice), stockQuantity: row.stockQuantity === null ? '' : String(row.stockQuantity) });
  };

  const uploadRowImage = async (row: ImportedRow, file?: File) => {
    if (!file) return;
    const body = new FormData(); body.append('image', file); setError('');
    try {
      const response = await api.post<ImportedRow>(`/product-imports/rows/${row.id}/image`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, storedImageUrl: response.data.storedImageUrl } : item));
      setMessage('Product image saved.');
    } catch (err) { setError(getApiErrorMessage(err, 'Could not save this image.')); }
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editing) return;
    try {
      await api.patch(`/product-imports/rows/${editing.id}`, {
        nameAr: editForm.nameAr.trim() || null, nameEn: editForm.nameEn.trim() || null,
        normalPrice: Number(editForm.normalPrice), companyPrice: editForm.companyPrice === '' ? null : Number(editForm.companyPrice),
        stockQuantity: editForm.stockQuantity === '' ? null : Number(editForm.stockQuantity),
      });
      setEditing(null); setMessage('Imported product updated.'); await load();
    } catch (err) { setError(getApiErrorMessage(err, 'Could not update this imported product.')); }
  };

  const publish = async () => {
    if (!selected.length) return;
    setPublishing(true); setError('');
    try {
      const response = await api.post<{ published: number; failed: number }>('/product-imports/publish', { rowIds: selected });
      setMessage(`${response.data.published} product${response.data.published === 1 ? '' : 's'} published${response.data.failed ? `, ${response.data.failed} failed` : ''}.`);
      await load();
    } catch (err) { setError(getApiErrorMessage(err, 'Could not publish the selected products.')); }
    finally { setPublishing(false); }
  };

  const allSelected = rows.length > 0 && rows.filter((row) => row.status === 'imported').every((row) => selected.includes(row.id));
  return <div>
    <div className="products-header"><div><Link className="catalog-back-link" href="/products">← Products</Link><h1>Imported products</h1><p>Review staged products before they become visible to customers.</p></div><div className="products-header-actions"><Link className="btn btn-outline" href="/products/import-history">Import history</Link><Link className="btn btn-primary" href="/products/import">Import Excel</Link></div></div>
    {error && !editing ? <div className="alert alert-error">{error}</div> : null}{message ? <div className="alert alert-success">{message}</div> : null}
    <div className="products-toolbar import-products-toolbar"><input placeholder="Search name or barcode…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="imported">Ready to publish</option><option value="warning">Analysis warnings</option><option value="invalid">Invalid</option><option value="published">Published</option><option value="failed">Failed</option><option value="all">All imported rows</option></select><span>{total.toLocaleString()} items</span><button className="btn btn-primary" disabled={!selected.length || publishing || status !== 'imported'} onClick={publish}>{publishing ? 'Publishing…' : `Publish selected (${selected.length})`}</button></div>
    <div className="card products-table-card import-table-scroll"><table className="table imported-products-table"><thead><tr><th><input type="checkbox" aria-label="Select page" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.filter((row) => row.status === 'imported').map((row) => row.id))} /></th><th>Product</th><th>Source</th><th>Category</th><th>Retail</th><th>Wholesale</th><th>Image</th><th>Status</th><th></th></tr></thead><tbody>
      {loading ? <tr><td colSpan={9}>Loading imported products…</td></tr> : rows.length === 0 ? <tr><td colSpan={9}>No imported products found.</td></tr> : rows.map((row) => {
        const selectedCategory = categories.find((category) => category.id === row.categoryId);
        return <tr key={row.id}><td><input type="checkbox" disabled={row.status !== 'imported'} checked={selected.includes(row.id)} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} /></td><td><div className="product-table-identity">{row.storedImageUrl ? <img src={row.storedImageUrl} alt="" loading="lazy" /> : <span className="product-table-placeholder">▧</span>}<div><strong>{row.nameEn || row.nameAr || 'Unnamed product'}</strong><span>{row.barcode || 'Missing barcode'}</span></div></div></td><td>{row.batch.originalName}<span className="import-cell-secondary">Excel row {row.excelRow}</span></td><td><div className="import-category-controls"><select value={row.categoryId || ''} disabled={!['imported', 'warning'].includes(row.status)} onChange={(event) => void updateCategory(row, event.target.value)}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{selectedCategory?.subcategories?.length ? <select value={row.subcategoryId || ''} onChange={(event) => void updateCategory(row, row.categoryId || '', event.target.value)}><option value="">No subcategory</option>{selectedCategory.subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select> : null}</div></td><td>{row.normalPrice === null ? '—' : `$${row.normalPrice.toFixed(2)}`}</td><td>{row.companyPrice === null ? 'Not set' : `$${row.companyPrice.toFixed(2)}`}</td><td><div className="import-image-control"><span>{row.storedImageUrl ? 'Stored' : 'Missing'}</span>{['imported', 'warning'].includes(row.status) ? <label>Replace<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadRowImage(row, event.target.files?.[0])} /></label> : null}</div></td><td><span className={`badge ${row.status === 'published' ? 'badge-success' : row.status === 'failed' || row.status === 'invalid' ? 'badge-danger' : 'badge-muted'}`}>{row.status}</span></td><td><button className="btn btn-outline" disabled={!['imported', 'warning'].includes(row.status)} onClick={() => openEdit(row)}>Edit</button></td></tr>;
      })}
    </tbody></table></div>
    <div className="import-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div>
    {editing ? <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><div className="modal product-modal" role="dialog" aria-modal="true"><div className="product-modal__header"><div><h2>Edit imported product</h2><p>Changes remain hidden until publication.</p></div><button className="product-modal__close" onClick={() => setEditing(null)}>×</button></div>{error ? <div className="alert alert-error">{error}</div> : null}<form onSubmit={saveEdit}><div className="form-group"><label>Arabic name</label><input dir="rtl" value={editForm.nameAr} onChange={(event) => setEditForm({ ...editForm, nameAr: event.target.value })} /></div><div className="form-group"><label>English name</label><input value={editForm.nameEn} onChange={(event) => setEditForm({ ...editForm, nameEn: event.target.value })} /></div><div className="product-pricing-grid"><div className="form-group"><label>Retail price</label><input type="number" min="0" step="0.01" required value={editForm.normalPrice} onChange={(event) => setEditForm({ ...editForm, normalPrice: event.target.value })} /></div><div className="form-group"><label>Wholesale price <span className="field-optional">Optional</span></label><input type="number" min="0" step="0.01" value={editForm.companyPrice} onChange={(event) => setEditForm({ ...editForm, companyPrice: event.target.value })} /></div><div className="form-group"><label>Stock <span className="field-optional">Empty uses 50 for new products</span></label><input type="number" min="0" step="1" value={editForm.stockQuantity} onChange={(event) => setEditForm({ ...editForm, stockQuantity: event.target.value })} /></div></div><div className="product-modal__actions"><button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save draft</button></div></form></div></div> : null}
  </div>;
}
