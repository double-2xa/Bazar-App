'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Order } from '@doublea/shared';
import { adminOrdersApi } from '@/services/orders';
import { formatStatusLabel, getApiErrorMessage } from '@/utils/orderDelivery';

type PaymentTab = 'unpaid' | 'paid' | 'all';

export default function WishPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<PaymentTab>('unpaid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError('');
    setLoading(true);
    adminOrdersApi
      .list({
        limit: 100,
        paymentMethod: 'wish_money',
        paymentStatus: tab === 'all' ? undefined : tab,
      })
      .then((res) => setOrders(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          setError(getApiErrorMessage(err, 'Failed to load Wish Money orders.'));
        }
      })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const setPaymentStatus = async (order: Order, paymentStatus: 'paid' | 'unpaid') => {
    if (order.paymentStatus === paymentStatus) return;
    setUpdatingId(order.id);
    setError('');
    try {
      await adminOrdersApi.updatePaymentStatus(order.id, paymentStatus);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update payment status.'));
      load();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Wish Money</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4 }}>
          Orders placed with Wish Money. Confirm when the customer has transferred payment.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="orders-view-switch" role="tablist" aria-label="Wish payment status">
        {([
          { id: 'unpaid', label: 'Awaiting payment' },
          { id: 'paid', label: 'Paid' },
          { id: 'all', label: 'All Wish orders' },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'is-selected' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--muted)' }}>Loading Wish Money orders…</p>
        ) : orders.length === 0 ? (
          <div className="orders-empty-state">
            <strong>
              {tab === 'unpaid'
                ? 'No unpaid Wish Money orders'
                : tab === 'paid'
                  ? 'No paid Wish Money orders yet'
                  : 'No Wish Money orders yet'}
            </strong>
            <p>
              When customers choose Wish Money at checkout, those orders appear here for confirmation.
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Order status</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Placed</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const busy = updatingId === order.id;
                return (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/orders/${order.id}`}
                        style={{ fontWeight: 600, color: 'var(--info)', textDecoration: 'none' }}
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>{order.user?.fullName ?? '—'}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{order.user?.phone ?? '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{order.user?.email ?? ''}</div>
                    </td>
                    <td>
                      <span className="badge badge-muted">{formatStatusLabel(order.status)}</span>
                    </td>
                    <td>${order.totalAmount.toFixed(2)}</td>
                    <td>
                      <span
                        className={`badge ${
                          order.paymentStatus === 'paid'
                            ? 'badge-success'
                            : order.paymentStatus === 'refunded'
                              ? 'badge-muted'
                              : 'badge-warning'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {order.paymentStatus !== 'paid' && order.status !== 'cancelled' ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: 12, padding: '6px 12px' }}
                            disabled={busy}
                            onClick={() => setPaymentStatus(order, 'paid')}
                          >
                            {busy ? 'Updating…' : 'Mark paid'}
                          </button>
                        ) : null}
                        {order.paymentStatus === 'paid' && order.status !== 'cancelled' ? (
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: 12, padding: '6px 12px' }}
                            disabled={busy}
                            onClick={() => setPaymentStatus(order, 'unpaid')}
                          >
                            {busy ? 'Updating…' : 'Mark unpaid'}
                          </button>
                        ) : null}
                        <Link
                          href={`/orders/${order.id}`}
                          style={{ fontSize: 12, color: 'var(--info)', alignSelf: 'center' }}
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
