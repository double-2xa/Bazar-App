'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DeliveryAgentSummary } from '@doublea/shared';
import {
  deliveryAgentsApi,
  type CreateDeliveryAgentInput,
  type UpdateDeliveryAgentInput,
} from '@/services/orders';
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
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [editingAgent, setEditingAgent] = useState<DeliveryAgentSummary | null>(null);
  const [editForm, setEditForm] = useState<UpdateDeliveryAgentInput>({
    email: '',
    fullName: '',
    phone: '',
    password: '',
    isActive: true,
  });

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
      setDialog(null);
      loadAgents();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create delivery agent.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (agent: DeliveryAgentSummary) => {
    setMessage('');
    setError('');
    setEditingAgent(agent);
    setEditForm({
      email: agent.email,
      fullName: agent.fullName,
      phone: agent.phone ?? '',
      password: '',
      isActive: agent.isActive,
    });
    setDialog('edit');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    setMessage('');
    setError('');
    setSubmitting(true);
    try {
      await deliveryAgentsApi.update(editingAgent.id, {
        ...editForm,
        phone: editForm.phone || undefined,
        password: editForm.password || undefined,
      });
      setMessage('Delivery agent updated successfully.');
      setDialog(null);
      setEditingAgent(null);
      loadAgents();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update delivery agent.'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalActiveOrders = agents.reduce((sum, a) => sum + a.activeOrderCount, 0);

  return (
    <div>
      <div className="delivery-agents-header">
        <div>
          <h1>Delivery agents</h1>
          <p>Manage drivers who fulfill customer orders. Active order counts come from the API.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => { setError(''); setMessage(''); setDialog('create'); }}>
          <span aria-hidden>＋</span> Create agent
        </button>
      </div>

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
                <th><span className="sr-only">Actions</span></th>
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
                  <td className="delivery-agent-row__action">
                    <button type="button" className="btn btn-outline" onClick={() => openEditDialog(agent)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                    No delivery agents yet. Create one to start assigning orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {dialog ? (
        <div className="modal-overlay delivery-agent-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setDialog(null); }}>
          <div className="modal delivery-agent-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-agent-dialog-title">
            <div className="delivery-agent-modal__header">
              <div>
                <h2 id="delivery-agent-dialog-title">{dialog === 'create' ? 'Create delivery agent' : 'Edit delivery agent'}</h2>
                <p>{dialog === 'create' ? 'Add a driver account for order fulfillment.' : 'Update account details, access, or password.'}</p>
              </div>
              <button type="button" className="delivery-agent-modal__close" aria-label="Close dialog" disabled={submitting} onClick={() => setDialog(null)}>×</button>
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            {dialog === 'create' ? (
              <form onSubmit={handleCreate}>
                {(['fullName', 'email', 'phone', 'password'] as const).map((field) => (
                  <div key={field} className="form-group">
                    <label htmlFor={`create-agent-${field}`}>{field === 'fullName' ? 'Full name' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <input id={`create-agent-${field}`} type={field === 'password' ? 'password' : field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} value={form[field] ?? ''} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required={field !== 'phone'} autoFocus={field === 'fullName'} />
                  </div>
                ))}
                <div className="delivery-agent-modal__actions">
                  <button type="button" className="btn btn-outline" disabled={submitting} onClick={() => setDialog(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create agent'}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleUpdate}>
                <div className="form-group">
                  <label htmlFor="edit-agent-name">Full name</label>
                  <input id="edit-agent-name" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-agent-email">Email</label>
                  <input id="edit-agent-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-agent-phone">Phone</label>
                  <input id="edit-agent-phone" type="tel" value={editForm.phone ?? ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-agent-password">New password <span className="field-optional">Optional</span></label>
                  <input id="edit-agent-password" type="password" minLength={6} value={editForm.password ?? ''} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current password" />
                </div>
                <label className="delivery-agent-status-control">
                  <span><strong>Account active</strong><small>Inactive agents cannot sign in or receive new assignments.</small></span>
                  <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                </label>
                {editingAgent && editingAgent.activeOrderCount > 0 && !editForm.isActive ? <p className="delivery-agent-modal__warning">This agent still has {editingAgent.activeOrderCount} active order{editingAgent.activeOrderCount === 1 ? '' : 's'}. Reassign them before deactivating the account.</p> : null}
                <div className="delivery-agent-modal__actions">
                  <button type="button" className="btn btn-outline" disabled={submitting} onClick={() => setDialog(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
