'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Order, DeliveryAgentSummary } from '@doublea/shared';
import { ADMIN_ORDER_TRANSITIONS } from '@doublea/shared';
import { adminOrdersApi, deliveryAgentsApi } from '@/services/orders';
import OrderDeliveryLocationPanel from '@/components/orders/OrderDeliveryLocationPanel';
import {
  canAssignDriver,
  canUnassignDriver,
  formatStatusLabel,
  getDeliveryAssignmentDisplay,
  getApiErrorMessage,
  isPreparingOrder,
  isReadyForDriverAssignment,
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
  const [markingPacked, setMarkingPacked] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

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

  const markPackingFinished = async () => {
    if (!order) return;
    setMarkingPacked(true);
    setError('');
    try {
      const updated = await adminOrdersApi.updateStatus(
        order.id,
        'confirmed',
        'Order prepared / packed',
      );
      setOrder(updated);
      setSelectedAgentId(updated.deliveryAgent?.id ?? updated.deliveryAgentId ?? '');
      flashSuccess('Order prepared / packed. Step 3 is unlocked — assign a driver.');
      requestAnimationFrame(() => {
        document.getElementById('order-step-delivery')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to mark packing as finished.'));
    } finally {
      setMarkingPacked(false);
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

  const downloadInvoice = async () => {
    if (!order) return;
    setDownloadingInvoice(true);
    setError('');
    try {
      const invoice = await adminOrdersApi.downloadInvoice(order.id);
      const url = URL.createObjectURL(invoice);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to download invoice.'));
    } finally {
      setDownloadingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Link href="/orders" style={{ color: 'var(--info)', textDecoration: 'none' }}>
          ← Back to Orders
        </Link>
        <p style={{ marginTop: 24, color: 'var(--muted)' }}>Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <Link href="/orders" style={{ color: 'var(--info)', textDecoration: 'none' }}>
          ← Back to Orders
        </Link>
        <div className="alert alert-error" style={{ marginTop: 24 }}>
          {error || 'Order not found.'}
        </div>
      </div>
    );
  }

  const delivery = getDeliveryAssignmentDisplay(order);
  const statusOptions = allowedStatuses(order.status);
  const canChangeStatus = statusOptions.length > 1;
  const preparing = isPreparingOrder(order.status);
  const deliveryUnlocked = isReadyForDriverAssignment(order.status);
  const showAssignControls = canAssignDriver(order.status);
  const showUnassign = canUnassignDriver(order.status);
  const activeAgents = agents.filter((a) => a.isActive);
  const waitingForDriver = delivery.needsAction;
  const deliveryLatitude = order.address?.latitude;
  const deliveryLongitude = order.address?.longitude;
  const hasExactDeliveryLocation =
    order.address?.hasExactLocation === true &&
    typeof deliveryLatitude === 'number' &&
    Number.isFinite(deliveryLatitude) &&
    deliveryLatitude >= -90 &&
    deliveryLatitude <= 90 &&
    typeof deliveryLongitude === 'number' &&
    Number.isFinite(deliveryLongitude) &&
    deliveryLongitude >= -180 &&
    deliveryLongitude <= 180;

  const step1Done = true;
  const step2Done = !preparing;
  const step3Active = deliveryUnlocked;

  return (
    <div>
      <Link href="/orders" style={{ color: 'var(--info)', textDecoration: 'none' }}>
        ← Back to Orders
      </Link>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '24px 0',
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>{order.orderNumber}</h1>
          <p style={{ color: 'var(--muted)', marginTop: 4 }}>
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" disabled={downloadingInvoice} onClick={downloadInvoice}>
            {downloadingInvoice ? 'Preparing invoice…' : 'Download invoice'}
          </button>
          <span className={`badge ${delivery.badge}`} style={{ fontSize: 14, padding: '8px 14px' }}>
            {delivery.label}
          </span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Worker flow steps */}
      <ol className="order-flow-steps">
        <li className={`order-flow-step ${step1Done ? 'is-done' : ''} is-current`}>
          <span className="order-flow-step__num">1</span>
          <span>
            <strong>Order info</strong>
            <small>Customer & delivery address</small>
          </span>
        </li>
        <li className={`order-flow-step ${step2Done ? 'is-done' : ''} ${preparing ? 'is-current' : ''}`}>
          <span className="order-flow-step__num">2</span>
          <span>
            <strong>Prepare items</strong>
            <small>{preparing ? 'Pack the order' : 'Packing finished'}</small>
          </span>
        </li>
        <li className={`order-flow-step ${step3Active ? 'is-done is-current' : 'is-locked'}`}>
          <span className="order-flow-step__num">3</span>
          <span>
            <strong>Assign driver</strong>
            <small>{step3Active ? 'Delivery management' : 'Unlocks after packing'}</small>
          </span>
        </li>
      </ol>

      {/* Step 1 — Order information */}
      <section className="card order-information-card" style={{ marginBottom: 24 }}>
        <div className="order-section-heading">
          <span className="order-section-heading__step">Step 1</span>
          <h2>Order information</h2>
        </div>
        <div className="order-information-grid">
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
              Customer
            </h3>
            <p>
              <strong>{order.user?.fullName}</strong>
            </p>
            <p style={{ color: 'var(--muted)' }}>{order.user?.email}</p>
            <p style={{ color: 'var(--muted)' }}>{order.user?.phone ?? '—'}</p>
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
              Payment: {order.paymentMethod.replace(/_/g, ' ')} · {order.paymentStatus}
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
              Delivery address
            </h3>
            {order.address ? (
              <>
                <p>
                  <strong>{order.address.label}</strong> — {order.address.fullName}
                </p>
                <p>
                  {order.address.street}
                  {order.address.building ? `, ${order.address.building}` : ''}
                </p>
                <p>
                  {[order.address.city, order.address.district, order.address.governorate]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {order.address.hasExactLocation ? (
                  <p style={{ color: '#2E9D58', fontSize: 13 }}>Exact GPS pin stored securely</p>
                ) : null}
                <p>{order.address.country}</p>
                <p style={{ color: 'var(--muted)', marginTop: 8 }}>Phone: {order.address.phone}</p>
              </>
            ) : (
              <p style={{ color: 'var(--muted)' }}>No address on file</p>
            )}
          </div>
          <article className="order-info-location">
            <div className="order-info-location__heading">
              <div>
                <span>Delivery pin</span>
                <strong>{hasExactDeliveryLocation ? 'Exact customer location' : 'Location unavailable'}</strong>
              </div>
              {hasExactDeliveryLocation ? <span className="badge badge-success">Secure GPS</span> : null}
            </div>
            {hasExactDeliveryLocation ? (
              <OrderDeliveryLocationPanel
                latitude={deliveryLatitude}
                longitude={deliveryLongitude}
                accuracyM={order.address?.locationAccuracyM ?? null}
                capturedAt={order.address?.locationCapturedAt ?? null}
              />
            ) : (
              <div className="order-location-empty">
                <span className="order-location-empty__pin" aria-hidden>⌖</span>
                <strong>No exact location to display</strong>
                <p>The written delivery address remains available for the driver.</p>
              </div>
            )}
          </article>
        </div>
        {order.customerNote ? (
          <p style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <strong>Customer note:</strong> {order.customerNote}
          </p>
        ) : null}
      </section>

      {/* Step 2 — Items to prepare */}
      <section className="card" style={{ marginBottom: 24 }}>
        <div className="order-section-heading">
          <span className="order-section-heading__step">Step 2</span>
          <h2>Items to prepare</h2>
        </div>
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

        {preparing ? (
          <div className="order-pack-action">
            <div>
              <p className="order-pack-action__title">Done packing this order?</p>
              <p>
                Click below when all items are prepared. That unlocks Step 3 so you can assign a
                driver.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary order-pack-action__btn"
              disabled={markingPacked}
              onClick={markPackingFinished}
            >
              {markingPacked ? 'Saving…' : 'Order prepared / packed'}
            </button>
          </div>
        ) : (
          <div className="order-pack-done">
            ✓ Order prepared / packed — Step 3 is unlocked below.
          </div>
        )}
      </section>

      {/* Step 3 — Delivery management (grayed until packing done) */}
      <section
        id="order-step-delivery"
        className={`card${
          preparing
            ? ' delivery-panel-locked'
            : ` delivery-panel${waitingForDriver ? ' delivery-panel-waiting' : ''}`
        }`}
        style={{ marginBottom: 24 }}
        aria-disabled={preparing}
      >
        <div className="order-section-heading">
          <span className="order-section-heading__step">Step 3</span>
          <h2>Delivery management</h2>
          {preparing ? <span className="order-lock-badge">Locked</span> : null}
        </div>

        {preparing ? (
          <div className="delivery-locked-body">
            <p className="delivery-locked-msg">
              This step stays grayed out until you click <strong>Order prepared / packed</strong> in
              Step 2.
            </p>
            <div className="delivery-locked-preview" aria-hidden="true">
              <select disabled style={{ minWidth: 260, padding: '10px 14px', borderRadius: 8 }}>
                <option>Select driver...</option>
              </select>
              <button type="button" className="btn btn-primary" disabled>
                Assign driver
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Order status
                </p>
                <p style={{ fontWeight: 600, marginTop: 4 }}>{formatStatusLabel(order.status)}</p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Payment
                </p>
                <p style={{ fontWeight: 600, marginTop: 4 }}>
                  {order.paymentMethod.replace(/_/g, ' ')} · {order.paymentStatus}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Assigned driver
                </p>
                <p style={{ fontWeight: 600, marginTop: 4 }}>
                  {order.deliveryAgent?.fullName ?? 'None'}
                  {order.deliveryAgent?.phone ? ` · ${order.deliveryAgent.phone}` : ''}
                </p>
              </div>
            </div>

            {waitingForDriver && (
              <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: 16 }}>
                Packing is done — assign a driver to continue.
              </p>
            )}

            {showAssignControls && (
              <div style={{ marginBottom: 16 }}>
                {agentsLoading ? (
                  <p style={{ color: 'var(--muted)' }}>Loading drivers...</p>
                ) : activeAgents.length === 0 ? (
                  <div className="alert alert-error" style={{ marginBottom: 0 }}>
                    No active delivery agents.{' '}
                    <Link
                      href="/delivery-agents"
                      style={{ color: 'inherit', textDecoration: 'underline' }}
                    >
                      Create a driver
                    </Link>{' '}
                    before assigning orders.
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        minWidth: 260,
                      }}
                    >
                      <option value="">Select driver...</option>
                      {activeAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.fullName} — {agent.activeOrderCount} active order
                          {agent.activeOrderCount === 1 ? '' : 's'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!selectedAgentId || assigning}
                      onClick={assignAgent}
                    >
                      {assigning
                        ? 'Assigning...'
                        : showUnassign
                          ? 'Reassign driver'
                          : 'Assign driver'}
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
              <div
                style={{
                  display: 'inline-flex',
                  gap: 8,
                  alignItems: 'center',
                  marginTop: showAssignControls ? 12 : 0,
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Admin status:</span>
                <select
                  value={order.status}
                  disabled={updating}
                  onChange={(e) => updateStatus(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    minWidth: 160,
                  }}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {formatStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Order summary</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Delivery</span>
            <span>${order.deliveryFee.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Discount</span>
            <span>-${order.discountAmount.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Tax</span>
            <span>${order.taxAmount.toFixed(2)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: 18,
              borderTop: '1px solid var(--border)',
              paddingTop: 12,
              marginTop: 8,
            }}
          >
            <span>Total</span>
            <span>${order.totalAmount.toFixed(2)}</span>
          </div>
          {order.deliveryProof && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600 }}>Delivery proof</p>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                {new Date(order.deliveryProof.deliveredAt).toLocaleString()}
                {order.deliveryProof.deliveredToName
                  ? ` · ${order.deliveryProof.deliveredToName}`
                  : ''}
              </p>
              {order.deliveryProof.deliveryNote && (
                <p style={{ fontSize: 13 }}>{order.deliveryProof.deliveryNote}</p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                {order.deliveryProof.agentSignatureDataUrl ? (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Driver signature</p>
                    <img
                      src={order.deliveryProof.agentSignatureDataUrl}
                      alt="Driver signature"
                      style={{ width: '100%', height: 100, objectFit: 'contain', background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}
                    />
                  </div>
                ) : null}
                {order.deliveryProof.clientSignatureDataUrl ? (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Client signature</p>
                    <img
                      src={order.deliveryProof.clientSignatureDataUrl}
                      alt="Client signature"
                      style={{ width: '100%', height: 100, objectFit: 'contain', background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="card order-status-history-card">
          <div className="order-status-history__header">
            <h2>Status history</h2>
            {(order.statusHistory?.length ?? 0) > 3 ? (
              <span className="order-status-history__hint">Latest first · scroll for older</span>
            ) : null}
          </div>
          {order.statusHistory?.length ? (
            <div
              className="order-status-history__scroll"
              tabIndex={0}
              role="region"
              aria-label="Order status history, newest first"
            >
              {[...order.statusHistory]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((entry, index) => (
                  <div key={`${entry.status}-${entry.createdAt}-${index}`} className="order-status-history__entry">
                    <strong>{formatStatusLabel(entry.status)}</strong>
                    <p>
                      {new Date(entry.createdAt).toLocaleString()}
                      {entry.note ? ` — ${entry.note}` : ''}
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>No status history yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
