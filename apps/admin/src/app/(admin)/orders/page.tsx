'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/services/api';

const ORDER_STATUSES = ['pending', 'confirmed', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  user?: { fullName: string };
  items?: { quantity: number }[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    setError('');
    api
      .get('/admin/orders', { params: { status: statusFilter || undefined, limit: 50 } })
      .then((r) => setOrders(r.data.data))
      .catch((err) => {
        if (err.response?.status !== 401) {
          setError('Failed to load orders. Please try again.');
        }
      });
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const current = orders.find((order) => order.id === id);
    if (!status || current?.status === status) return;

    setUpdatingId(id);
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status } : order)));

    try {
      await api.patch(`/admin/orders/${id}/status`, { status });
      load();
    } catch {
      setError('Failed to update order status.');
      load();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Orders</h1>
      {error && <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}
      >
        <option value="">All Statuses</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
        ))}
      </select>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Date</th>
              <th>Update Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
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
                  <td>{order.user?.fullName}</td>
                  <td>{itemCount}</td>
                  <td>${order.totalAmount.toFixed(2)}</td>
                  <td><span className="badge badge-info">{order.status.replace(/_/g, ' ')}</span></td>
                  <td>{order.paymentStatus}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, minWidth: 130 }}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
