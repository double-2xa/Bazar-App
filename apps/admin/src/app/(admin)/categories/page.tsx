'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Category } from '@doublea/shared';
import api from '@/services/api';
import { getApiErrorMessage } from '@/utils/orderDelivery';

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

const EMPTY_FORM: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  isActive: true,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Category[]>('/categories', { params: { all: true } })
      .then((response) => setCategories(response.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load categories.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const openCreateDialog = () => {
    setForm(EMPTY_FORM);
    setEditingCategory(null);
    setError('');
    setMessage('');
    setDialog('create');
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      isActive: category.isActive,
    });
    setError('');
    setMessage('');
    setDialog('edit');
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      isActive: form.isActive,
    };

    try {
      if (dialog === 'edit' && editingCategory) {
        await api.patch(`/categories/${editingCategory.id}`, payload);
        setMessage('Category updated successfully.');
      } else {
        await api.post('/categories', payload);
        setMessage('Category created successfully.');
      }
      setDialog(null);
      setEditingCategory(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, dialog === 'edit' ? 'Failed to update category.' : 'Failed to create category.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="categories-header">
        <div>
          <h1>Categories</h1>
          <p>Organize the catalog and control which categories customers can browse.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateDialog}>
          <span aria-hidden>＋</span> Add category
        </button>
      </div>

      {error && !dialog ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="card categories-table-card">
        {loading ? (
          <p className="state-message">Loading categories...</p>
        ) : categories.length === 0 ? (
          <div className="orders-empty-state">
            <strong>No categories yet</strong>
            <p>Add the first category to start organizing products.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td style={{ fontWeight: 600 }}>{category.name}</td>
                  <td><code className="category-slug">{category.slug}</code></td>
                  <td className="category-description">{category.description || '—'}</td>
                  <td>
                    <span className={`badge ${category.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="category-row__action">
                    <button type="button" className="btn btn-outline" onClick={() => openEditDialog(category)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialog ? (
        <div className="modal-overlay category-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setDialog(null); }}>
          <div className="modal category-modal" role="dialog" aria-modal="true" aria-labelledby="category-dialog-title">
            <div className="category-modal__header">
              <div>
                <h2 id="category-dialog-title">{dialog === 'create' ? 'Add category' : 'Edit category'}</h2>
                <p>{dialog === 'create' ? 'Create a new group for products.' : 'Update category details and storefront visibility.'}</p>
              </div>
              <button type="button" className="category-modal__close" aria-label="Close dialog" disabled={submitting} onClick={() => setDialog(null)}>×</button>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <form onSubmit={saveCategory}>
              <div className="form-group">
                <label htmlFor="category-name">Name</label>
                <input id="category-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label htmlFor="category-slug">Slug</label>
                <input id="category-slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required placeholder="example-category" />
              </div>
              <div className="form-group">
                <label htmlFor="category-description">Description <span className="field-optional">Optional</span></label>
                <textarea id="category-description" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="category-image">Image URL <span className="field-optional">Optional</span></label>
                <input id="category-image" type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." />
              </div>
              {dialog === 'edit' ? (
                <label className="category-status-control">
                  <span><strong>Category active</strong><small>Inactive categories are hidden from the customer catalog.</small></span>
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                </label>
              ) : null}
              <div className="category-modal__actions">
                <button type="button" className="btn btn-outline" disabled={submitting} onClick={() => setDialog(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : dialog === 'create' ? 'Create category' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
