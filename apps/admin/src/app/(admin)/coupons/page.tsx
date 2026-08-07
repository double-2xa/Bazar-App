'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Coupon, CouponType } from '@doublea/shared';
import api from '@/services/api';
import { getApiErrorMessage } from '@/utils/orderDelivery';

type CouponForm = {
  code: string;
  type: CouponType;
  value: string;
  minOrderAmount: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const EMPTY_FORM: CouponForm = {
  code: '',
  type: 'percentage',
  value: '',
  minOrderAmount: '0',
  startsAt: '',
  expiresAt: '',
  isActive: true,
};

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Coupon[]>('/admin/coupons')
      .then((response) => setCoupons(response.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load coupons.')))
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
    setEditingCoupon(null);
    setError('');
    setMessage('');
    setDialog('create');
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minOrderAmount: String(coupon.minOrderAmount),
      startsAt: toDateTimeLocal(coupon.startsAt),
      expiresAt: toDateTimeLocal(coupon.expiresAt),
      isActive: coupon.isActive,
    });
    setError('');
    setMessage('');
    setDialog('edit');
  };

  const saveCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    const startsAt = new Date(form.startsAt);
    const expiresAt = new Date(form.expiresAt);
    if (expiresAt <= startsAt) {
      setError('Expiration must be later than the start date.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrderAmount: Number(form.minOrderAmount || 0),
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: form.isActive,
    };

    try {
      if (dialog === 'edit' && editingCoupon) {
        await api.patch(`/admin/coupons/${editingCoupon.id}`, payload);
        setMessage('Coupon updated successfully.');
      } else {
        await api.post('/admin/coupons', payload);
        setMessage('Coupon created successfully.');
      }
      setDialog(null);
      setEditingCoupon(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, dialog === 'edit' ? 'Failed to update coupon.' : 'Failed to create coupon.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="coupons-header">
        <div>
          <h1>Coupons</h1>
          <p>Create promotions and control when each discount is available.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateDialog}>
          <span aria-hidden>＋</span> Add coupon
        </button>
      </div>

      {error && !dialog ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="card coupons-table-card">
        {loading ? (
          <p className="state-message">Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <div className="orders-empty-state">
            <strong>No coupons yet</strong>
            <p>Add the first coupon when you are ready to run a promotion.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Minimum order</th>
                <th>Starts</th>
                <th>Expires</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td><code className="coupon-code">{coupon.code}</code></td>
                  <td>{coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value.toFixed(2)}`}</td>
                  <td>${coupon.minOrderAmount.toFixed(2)}</td>
                  <td>{new Date(coupon.startsAt).toLocaleString()}</td>
                  <td>{new Date(coupon.expiresAt).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${coupon.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="coupon-row__action">
                    <button type="button" className="btn btn-outline" onClick={() => openEditDialog(coupon)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialog ? (
        <div className="modal-overlay coupon-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setDialog(null); }}>
          <div className="modal coupon-modal" role="dialog" aria-modal="true" aria-labelledby="coupon-dialog-title">
            <div className="coupon-modal__header">
              <div>
                <h2 id="coupon-dialog-title">{dialog === 'create' ? 'Add coupon' : 'Edit coupon'}</h2>
                <p>{dialog === 'create' ? 'Configure a new customer discount.' : 'Update discount rules, dates, and availability.'}</p>
              </div>
              <button type="button" className="coupon-modal__close" aria-label="Close dialog" disabled={submitting} onClick={() => setDialog(null)}>×</button>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <form onSubmit={saveCoupon}>
              <div className="coupon-form-grid">
                <div className="form-group coupon-form-grid__wide">
                  <label htmlFor="coupon-code">Code</label>
                  <input id="coupon-code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required autoFocus placeholder="SUMMER20" />
                </div>
                <div className="form-group">
                  <label htmlFor="coupon-type">Type</label>
                  <select id="coupon-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CouponType })}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="coupon-value">Value</label>
                  <input id="coupon-value" type="number" min="0.01" max={form.type === 'percentage' ? '100' : undefined} step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required />
                </div>
                <div className="form-group coupon-form-grid__wide">
                  <label htmlFor="coupon-minimum">Minimum order amount</label>
                  <input id="coupon-minimum" type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })} required />
                </div>
                <div className="form-group">
                  <label htmlFor="coupon-start">Starts at</label>
                  <input id="coupon-start" type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required />
                </div>
                <div className="form-group">
                  <label htmlFor="coupon-expiry">Expires at</label>
                  <input id="coupon-expiry" type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} required />
                </div>
              </div>
              {dialog === 'edit' ? (
                <label className="coupon-status-control">
                  <span><strong>Coupon active</strong><small>Inactive coupons cannot be applied at checkout.</small></span>
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                </label>
              ) : null}
              <div className="coupon-modal__actions">
                <button type="button" className="btn btn-outline" disabled={submitting} onClick={() => setDialog(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : dialog === 'create' ? 'Create coupon' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
