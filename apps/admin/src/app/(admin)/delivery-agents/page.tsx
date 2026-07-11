'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DeliveryAgentSummary } from '@doublea/shared';
import { deliveryAgentsApi, type CreateDeliveryAgentInput } from '@/services/orders';
import { getApiErrorMessage } from '@/utils/orderDelivery';

export default function DeliveryAgentsPage() {
  const [form, setForm] = useState<CreateDeliveryAgentInput>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
  });
  const [agents, setAgents] = useState<DeliveryAgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAgents = useCallback(() => {
    setLoading(true);
    setError('');
    deliveryAgentsApi
      .list()
      .then(setAgents)
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load delivery agents.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);
    try {
      await deliveryAgentsApi.create({
        ...form,
        phone: form.phone || undefined,
      });
      setMessage('Delivery agent created successfully.');
      setForm({ email: '', password: '', fullName: '', phone: '' });
      loadAgents();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create delivery agent.'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalActiveOrders = agents.reduce((sum, a) => sum + a.activeOrderCount, 0);

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Delivery agents</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
        Manage drivers who fulfill customer orders. Active order counts come from the API.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="card stat-card">
          <div className="stat-value">{agents.length}</div>
          <div className="stat-label">Total drivers</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{agents.filter((a) => a.isActive).length}</div>
          <div className="stat-label">Active drivers</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{totalActiveOrders}</div>
          <div className="stat-label">Orders in delivery flow</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--muted)' }}>Loading delivery agents...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Active orders</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td style={{ fontWeight: 500 }}>{agent.fullName}</td>
                  <td>{agent.email}</td>
                  <td>{agent.phone ?? '—'}</td>
                  <td>
                    <span className={agent.activeOrderCount > 0 ? 'badge badge-brand' : 'badge badge-muted'}>
                      {agent.activeOrderCount}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${agent.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                    No delivery agents yet. Create one below to start assigning orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <h3 style={{ marginBottom: 16 }}>Create delivery agent</h3>
        <form onSubmit={handleCreate}>
          {(['fullName', 'email', 'phone', 'password'] as const).map((f) => (
            <div key={f} className="form-group">
              <label>{f === 'fullName' ? 'Full name' : f.charAt(0).toUpperCase() + f.slice(1)}</label>
              <input
                type={f === 'password' ? 'password' : f === 'email' ? 'email' : 'text'}
                value={form[f] ?? ''}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                required={f !== 'phone'}
              />
            </div>
          ))}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create agent'}
          </button>
        </form>
      </div>
    </div>
  );
}
