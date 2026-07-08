'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    api.get('/admin/orders', { params: { status: statusFilter || undefined, limit: 50 } }).then((r) => setOrders(r.data.data));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/admin/orders/${id}/status`, { status });
    load();
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Orders</h1>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
        <option value="">All Statuses</option>
        {['pending', 'confirmed', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'].map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
        ))}
      </select>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Payment</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id as string}>
                <td style={{ fontWeight: 500 }}>{o.orderNumber as string}</td>
                <td>{(o.user as { fullName: string })?.fullName}</td>
                <td>${(o.totalAmount as number).toFixed(2)}</td>
                <td><span className="badge badge-info">{(o.status as string).replace(/_/g, ' ')}</span></td>
                <td>{o.paymentStatus as string}</td>
                <td>{new Date(o.createdAt as string).toLocaleDateString()}</td>
                <td>
                  <select onChange={(e) => updateStatus(o.id as string, e.target.value)} defaultValue="" style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6 }}>
                    <option value="" disabled>Update</option>
                    {['confirmed', 'assigned', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
