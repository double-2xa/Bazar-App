'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/services/api';

const ORDER_STATUSES = ['pending', 'confirmed', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedPriceType: string;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  customerNote: string | null;
  createdAt: string;
  items: OrderItem[];
  user?: { fullName: string; email: string; phone: string };
  address?: {
    label: string;
    fullName: string;
    phone: string;
    street: string;
    building?: string | null;
    city: string;
    country: string;
    postalCode: string;
  };
  statusHistory?: { status: string; note: string | null; createdAt: string }[];
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = () => {
    if (!params.id) return;
    setError('');
    api
      .get(`/orders/${params.id}`)
      .then((r) => setOrder(r.data))
      .catch(() => setError('Failed to load order details.'));
  };

  useEffect(() => { load(); }, [params.id]);

  const updateStatus = async (status: string) => {
    if (!order || status === order.status) return;
    setUpdating(true);
    try {
      await api.patch(`/admin/orders/${order.id}/status`, { status });
      load();
    } catch {
      setError('Failed to update order status.');
    } finally {
      setUpdating(false);
    }
  };

  if (!order) {
    return (
      <div>
        <Link href="/orders" style={{ color: 'var(--info)', textDecoration: 'none' }}>← Back to Orders</Link>
        <p style={{ marginTop: 24, color: 'var(--muted)' }}>{error || 'Loading order...'}</p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/orders" style={{ color: 'var(--info)', textDecoration: 'none' }}>← Back to Orders</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>{order.orderNumber}</h1>
          <p style={{ color: 'var(--muted)', marginTop: 4 }}>
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <select
          value={order.status}
          disabled={updating}
          onChange={(e) => updateStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', minWidth: 160 }}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Customer</h2>
          <p><strong>{order.user?.fullName}</strong></p>
          <p style={{ color: 'var(--muted)' }}>{order.user?.email}</p>
          <p style={{ color: 'var(--muted)' }}>{order.user?.phone}</p>
        </div>
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Delivery Address</h2>
          {order.address ? (
            <>
              <p><strong>{order.address.label}</strong> — {order.address.fullName}</p>
              <p>{order.address.street}{order.address.building ? `, ${order.address.building}` : ''}</p>
              <p>{order.address.city}, {order.address.postalCode}</p>
              <p>{order.address.country}</p>
              <p style={{ color: 'var(--muted)', marginTop: 8 }}>Phone: {order.address.phone}</p>
            </>
          ) : (
            <p style={{ color: 'var(--muted)' }}>No address on file</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Items to Prepare</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Price Type</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 500 }}>{item.productName}</td>
                <td>{item.quantity}</td>
                <td>${item.unitPrice.toFixed(2)}</td>
                <td>{item.selectedPriceType}</td>
                <td>${item.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Order Summary</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Delivery</span><span>${order.deliveryFee.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Discount</span><span>-${order.discountAmount.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Tax</span><span>${order.taxAmount.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
            <span>Total</span><span>${order.totalAmount.toFixed(2)}</span>
          </div>
          <p style={{ marginTop: 12, color: 'var(--muted)' }}>
            Payment: {order.paymentMethod.replace(/_/g, ' ')} ({order.paymentStatus})
          </p>
          {order.customerNote && (
            <p style={{ marginTop: 8 }}><strong>Note:</strong> {order.customerNote}</p>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Status History</h2>
          {order.statusHistory?.length ? (
            order.statusHistory.map((entry, index) => (
              <div key={`${entry.status}-${entry.createdAt}-${index}`} style={{ marginBottom: 12 }}>
                <strong>{entry.status.replace(/_/g, ' ')}</strong>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {new Date(entry.createdAt).toLocaleString()}
                  {entry.note ? ` — ${entry.note}` : ''}
                </p>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--muted)' }}>No status history yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
