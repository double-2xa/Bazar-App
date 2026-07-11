'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Order, DeliveryAgentSummary } from '@doublea/shared';
import { ADMIN_ORDER_TRANSITIONS } from '@doublea/shared';
import { adminOrdersApi, deliveryAgentsApi } from '@/services/orders';
import {
  canAssignDriver,
  canUnassignDriver,
  formatStatusLabel,
  getDeliveryAssignmentDisplay,
  getApiErrorMessage,
} from '@/utils/orderDelivery';

function allowedStatuses(current: string): string[] {
  const next = ADMIN_ORDER_TRANSITIONS[current] ?? [];
  return [current, ...next];
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [agents, setAgents] = useState<DeliveryAgentSummary[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  const loadOrder = useCallback(() => {
    if (!params.id) return;
    setLoading(true);
    setError('');
    adminOrdersApi
      .getById(params.id)
      .then((data) => {
        setOrder(data);
        setSelectedAgentId(data.deliveryAgent?.id ?? data.deliveryAgentId ?? '');
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load order details.')))
      .finally(() => setLoading(false));
  }, [params.id]);

  const loadAgents = useCallback(() => {
    setAgentsLoading(true);
    deliveryAgentsApi
      .list()
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setAgentsLoading(false));
  }, []);

  useEffect(() => {
    loadOrder();
    loadAgents();
  }, [loadOrder, loadAgents]);

  const flashSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 4000);
  };

  const updateStatus = async (status: string) => {
    if (!order || status === order.status) return;
    setUpdating(true);
    setError('');
    try {
      await adminOrdersApi.updateStatus(order.id, status);
      flashSuccess(`Order status updated to ${formatStatusLabel(status)}.`);
      loadOrder();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update order status.'));
    } finally {
      setUpdating(false);
    }
  };

  const assignAgent = async () => {
    if (!order || !selectedAgentId) return;
    setAssigning(true);
    setError('');
    try {
      await adminOrdersApi.assignAgent(order.id, selectedAgentId);
      flashSuccess('Driver assigned successfully.');
      loadOrder();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to assign delivery agent.'));
    } finally {
      setAssigning(false);
    }
  };

  const unassignAgent = async () => {
    if (!order) return;
    setUnassigning(true);
    setError('');
    try {
      await adminOrdersApi.unassignAgent(order.id);
      flashSuccess('Driver unassigned. Order is ready for reassignment.');
      loadOrder();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to unassign delivery agent.'));
    } finally {
      setUnassigning(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Link href="/orders" style={{ color: 'var(--info)', textDecoration: 'none' }}>← Back to Orders</Link>
        <p style={{ marginTop: 24, color: 'var(--muted)' }}>Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <Link href="/orders" style={{ color: 'var(--info)', textDecoration: 'none' }}>← Back to Orders</Link>
        <div className="alert alert-error" style={{ marginTop: 24 }}>{error || 'Order not found.'}</div>
      </div>
    );
  }

  const delivery = getDeliveryAssignmentDisplay(order);
  const statusOptions = allowedStatuses(order.status);
  const canChangeStatus = statusOptions.length > 1;
  const showAssignControls = canAssignDriver(order.status);
  const showUnassign = canUnassignDriver(order.status);
  const activeAgents = agents.filter((a) => a.isActive);
  const waitingForDriver = delivery.needsAction;

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
        <span className={`badge ${delivery.badge}`} style={{ fontSize: 14, padding: '8px 14px' }}>
          {delivery.label}
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Delivery panel */}
      <div
        className={`card delivery-panel${waitingForDriver ? ' delivery-panel-waiting' : ''}`}
        style={{ marginBottom: 24 }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Delivery management</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Order status</p>
            <p style={{ fontWeight: 600, marginTop: 4 }}>{formatStatusLabel(order.status)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment</p>
            <p style={{ fontWeight: 600, marginTop: 4 }}>
              {order.paymentMethod.replace(/_/g, ' ')} · {order.paymentStatus}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Assigned driver</p>
            <p style={{ fontWeight: 600, marginTop: 4 }}>
              {order.deliveryAgent?.fullName ?? 'None'}
              {order.deliveryAgent?.phone ? ` · ${order.deliveryAgent.phone}` : ''}
            </p>
          </div>
        </div>

        {waitingForDriver && (
          <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: 16 }}>
            This order is waiting for driver assignment.
          </p>
        )}

        {showAssignControls && (
          <div style={{ marginBottom: 16 }}>
            {agentsLoading ? (
              <p style={{ color: 'var(--muted)' }}>Loading drivers...</p>
            ) : activeAgents.length === 0 ? (
              <div className="alert alert-error" style={{ marginBottom: 0 }}>
                No active delivery agents.{' '}
                <Link href="/delivery-agents" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  Create a driver
                </Link>{' '}
                before assigning orders.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', minWidth: 260 }}
                >
                  <option value="">Select driver...</option>
                  {activeAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.fullName} — {agent.activeOrderCount} active order{agent.activeOrderCount === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!selectedAgentId || assigning}
                  onClick={assignAgent}
                >
                  {assigning ? 'Assigning...' : showUnassign ? 'Reassign driver' : 'Assign driver'}
                </button>
              </div>
            )}
          </div>
        )}

        {showUnassign && (
          <button
            type="button"
            className="btn btn-outline"
            disabled={unassigning}
            onClick={unassignAgent}
            style={{ marginRight: 12 }}
          >
            {unassigning ? 'Unassigning...' : 'Unassign driver'}
          </button>
        )}

        {canChangeStatus && (
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginTop: showAssignControls ? 12 : 0 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Admin status:</span>
            <select
              value={order.status}
              disabled={updating}
              onChange={(e) => updateStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', minWidth: 160 }}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{formatStatusLabel(s)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Customer</h2>
          <p><strong>{order.user?.fullName}</strong></p>
          <p style={{ color: 'var(--muted)' }}>{order.user?.email}</p>
          <p style={{ color: 'var(--muted)' }}>{order.user?.phone ?? '—'}</p>
        </div>
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Delivery address</h2>
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
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Items to prepare</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Price type</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item) => (
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
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Order summary</h2>
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
          {order.customerNote && (
            <p style={{ marginTop: 12 }}><strong>Customer note:</strong> {order.customerNote}</p>
          )}
          {order.deliveryProof && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600 }}>Delivery proof</p>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                {new Date(order.deliveryProof.deliveredAt).toLocaleString()}
                {order.deliveryProof.deliveredToName ? ` · ${order.deliveryProof.deliveredToName}` : ''}
              </p>
              {order.deliveryProof.deliveryNote && (
                <p style={{ fontSize: 13 }}>{order.deliveryProof.deliveryNote}</p>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Status history</h2>
          {order.statusHistory?.length ? (
            order.statusHistory.map((entry, index) => (
              <div key={`${entry.status}-${entry.createdAt}-${index}`} style={{ marginBottom: 12 }}>
                <strong>{formatStatusLabel(entry.status)}</strong>
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
