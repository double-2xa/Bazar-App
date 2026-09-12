'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { resolveApiAssetUrl } from '@/services/api';
import type { Category, PaginatedResponse, Product } from '@doublea/shared';
import { getApiErrorMessage } from '@/utils/orderDelivery';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import Link from 'next/link';

type ProductForm = {
  name: string;
  brand: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  normalPrice: string;
  companyPrice: string;
  stockQuantity: string;
  isActive: boolean;
};

const EMPTY_FORM: ProductForm = {
  name: '',
  brand: '',
  description: '',
  imageUrl: '',
  categoryId: '',
  normalPrice: '',
  companyPrice: '',
  stockQuantity: '',
  isActive: true,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'inactive'>('live');

  const loadProducts = useCallback(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<Product>>('/products/admin/all', {
        params: { page, limit: 50, search: search || undefined, status: statusFilter },
      })
      .then((response) => { setProducts(response.data.data); setTotal(response.data.total); setTotalPages(response.data.totalPages); })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load products.')))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  const loadCategories = useCallback(() => {
    api
      .get<Category[]>('/categories', { params: { all: true } })
      .then((response) => setCategories(response.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load categories.')));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadProducts, 250);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!dialog) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) setDialog(null);
    };
    document.addEventListener('keydown', handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [dialog, submitting]);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const openCreateDialog = () => {
    setForm(EMPTY_FORM);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview('');
    setError('');
    setMessage('');
    setDialog('create');
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      brand: product.brand ?? '',
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
      categoryId: product.categoryId ?? '',
      normalPrice: String(product.normalPrice),
      companyPrice: product.companyPrice === null ? '' : String(product.companyPrice),
      stockQuantity: String(product.stockQuantity),
      isActive: product.isActive,
    });
    setImageFile(null);
    setImagePreview(resolveApiAssetUrl(product.imageUrl));
    setError('');
    setMessage('');
    setDialog('edit');
  };

  const selectImage = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('The image must be 5 MB or smaller.');
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const body = new FormData();
    body.append('image', file);
    const response = await api.post<{ path: string }>('/products/admin/upload-image', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const apiUrl = new URL(api.defaults.baseURL ?? '/api', window.location.origin);
    return new URL(response.data.path, apiUrl.origin).toString();
  };

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const imageUrl = imageFile ? await uploadImage(imageFile) : form.imageUrl.trim() || undefined;
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        description: form.description.trim(),
        imageUrl,
        categoryId: form.categoryId || undefined,
        normalPrice: Number(form.normalPrice),
        companyPrice: form.companyPrice === '' ? undefined : Number(form.companyPrice),
        stockQuantity: Number.parseInt(form.stockQuantity, 10),
        isActive: form.isActive,
      };

      if (dialog === 'edit' && editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, payload);
        setMessage('Product updated successfully.');
      } else {
        await api.post('/products', payload);
        setMessage('Product created successfully.');
      }

      setDialog(null);
      setEditingProduct(null);
      setImageFile(null);
      setImagePreview('');
      setForm(EMPTY_FORM);
      loadProducts();
    } catch (err) {
      setError(getApiErrorMessage(err, dialog === 'edit' ? 'Failed to update product.' : 'Failed to create product.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      setMessage('Product deleted successfully.');
      loadProducts();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete product.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="products-header">
        <div>
          <h1>Products</h1>
          <p>Manage product details, pricing, stock, and storefront availability.</p>
        </div>
        <div className="products-header-actions"><Link className="btn btn-outline" href="/products/imported">Imported products</Link><Link className="btn btn-outline" href="/products/import-history">Import history</Link><Link className="btn btn-outline" href="/products/import">Import Excel</Link><button type="button" className="btn btn-primary" onClick={openCreateDialog}><span aria-hidden>＋</span> Add product</button></div>
      </div>

      {error && !dialog ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="products-toolbar">
        <input placeholder="Search name or barcode…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} aria-label="Search products" />
        <select aria-label="Product status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); }}><option value="live">Live products</option><option value="inactive">Inactive products</option><option value="all">All products</option></select>
        <span>{total.toLocaleString()} product{total === 1 ? '' : 's'}</span>
      </div>

      <div className="card products-table-card">
        {loading ? (
          <p className="state-message">Loading products...</p>
        ) : products.length === 0 ? (
          <div className="orders-empty-state"><strong>No products found</strong><p>Add a product or change the search.</p></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Normal price</th>
                <th>Company price</th>
                <th>Stock</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-table-identity">
                      {product.imageUrl ? <img src={resolveApiAssetUrl(product.imageUrl)} alt="" loading="lazy" /> : <span className="product-table-placeholder" aria-hidden>▧</span>}
                      <div><strong>{product.name}</strong><span>{product.brand || 'No brand'}</span></div>
                    </div>
                  </td>
                  <td>{product.category?.name ?? '—'}</td>
                  <td>${product.normalPrice.toFixed(2)}</td>
                  <td>{product.companyPrice === null ? 'Not set' : `$${product.companyPrice.toFixed(2)}`}</td>
                  <td><span className={`badge ${product.stockQuantity > 0 ? 'badge-muted' : 'badge-danger'}`}>{product.stockQuantity}</span></td>
                  <td><span className={`badge ${product.isActive ? 'badge-success' : 'badge-danger'}`}>{product.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="product-row__actions">
                    <button type="button" className="btn btn-outline" onClick={() => openEditDialog(product)}>Edit</button>
                    <button type="button" className="product-delete-button" onClick={() => { setError(''); setMessage(''); setDeleteTarget(product); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="import-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {totalPages || 1}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div>

      {dialog ? (
        <div className="modal-overlay product-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setDialog(null); }}>
          <div className="modal product-modal" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
            <div className="product-modal__header">
              <div><h2 id="product-dialog-title">{dialog === 'create' ? 'Add product' : 'Edit product'}</h2><p>Only the essential catalog and pricing information.</p></div>
              <button type="button" className="product-modal__close" aria-label="Close dialog" disabled={submitting} onClick={() => setDialog(null)}>×</button>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <form onSubmit={saveProduct}>
              <div className="product-form-grid">
                <div className="product-form-main">
                  <div className="form-group"><label htmlFor="product-name">Name</label><input id="product-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required autoFocus /></div>
                  <div className="form-group"><label htmlFor="product-brand">Brand <span className="field-optional">Optional</span></label><input id="product-brand" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></div>
                  <div className="form-group"><label htmlFor="product-description">Description <span className="field-optional">Optional</span></label><textarea id="product-description" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
                  <div className="form-group"><label htmlFor="product-category">Category <span className="field-optional">Optional</span></label><select id="product-category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.isActive ? '' : ' (inactive)'}</option>)}</select></div>
                </div>

                <div className="product-image-editor">
                  <div className="product-image-preview">{imagePreview ? <img src={imagePreview} alt="Product preview" /> : <div><span aria-hidden>▧</span><p>Product image</p></div>}</div>
                  <label className="product-upload-button" htmlFor="product-image-file">Upload image</label>
                  <input id="product-image-file" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} />
                  <span className="product-upload-help">JPEG, PNG or WebP · maximum 5 MB</span>
                  <div className="product-image-or"><span>or</span></div>
                  <label htmlFor="product-image-url">Image URL</label>
                  <input id="product-image-url" type="text" inputMode="url" value={form.imageUrl} onChange={(event) => { setForm({ ...form, imageUrl: event.target.value }); setImageFile(null); setImagePreview(resolveApiAssetUrl(event.target.value)); }} placeholder="https://..." />
                </div>
              </div>

              <div className="product-pricing-grid">
                <div className="form-group"><label htmlFor="product-normal-price">Normal price</label><input id="product-normal-price" type="number" min="0" step="0.01" value={form.normalPrice} onChange={(event) => setForm({ ...form, normalPrice: event.target.value })} required /></div>
                <div className="form-group"><label htmlFor="product-company-price">Company price <span className="field-optional">Optional</span></label><input id="product-company-price" type="number" min="0" step="0.01" value={form.companyPrice} onChange={(event) => setForm({ ...form, companyPrice: event.target.value })} /></div>
                <div className="form-group"><label htmlFor="product-stock">Stock quantity</label><input id="product-stock" type="number" min="0" step="1" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} required /></div>
              </div>

              {dialog === 'edit' ? <label className="product-status-control"><span><strong>Product active</strong><small>Inactive products remain saved but are hidden from customers.</small></span><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /></label> : null}

              <div className="product-modal__actions"><button type="button" className="btn btn-outline" disabled={submitting} onClick={() => setDialog(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? imageFile ? 'Uploading…' : 'Saving…' : dialog === 'create' ? 'Create product' : 'Save changes'}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      <DeleteConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Delete product?"
        subject={deleteTarget?.name ?? 'this product'}
        busy={deleting}
        error={deleteTarget ? error : null}
        confirmLabel="Delete product"
        onCancel={() => { if (!deleting) { setDeleteTarget(null); setError(''); } }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
