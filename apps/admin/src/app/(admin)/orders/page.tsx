'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Order } from '@doublea/shared';
import { ADMIN_ORDER_TRANSITIONS } from '@doublea/shared';
import { adminOrdersApi } from '@/services/orders';
import {
  type DeliveryFilter,
  getDeliveryAssignmentDisplay,
  matchesDeliveryFilter,
  formatStatusLabel,
  getApiErrorMessage,
} from '@/utils/orderDelivery';

const DELIVERY_FILTERS: { value: DeliveryFilter; label: string }[] = [
  { value: 'all', label: 'All orders' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_delivery', label: 'In delivery' },
  { value: 'delivered', label: 'Delivered' },
];

const VALID_DELIVERY_FILTERS = new Set<DeliveryFilter>(
  DELIVERY_FILTERS.map((f) => f.value),
);

function parseDeliveryFilter(raw: string | null): DeliveryFilter {
  if (!raw) return 'all';
  const normalized = raw === 'in-delivery' ? 'in_delivery' : raw;
  return VALID_DELIVERY_FILTERS.has(normalized as DeliveryFilter)
    ? (normalized as DeliveryFilter)
    : 'all';
}

function allowedStatuses(current: string): string[] {
  const next = ADMIN_ORDER_TRANSITIONS[current] ?? [];
  return [current, ...next];
}

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>(() =>
    parseDeliveryFilter(searchParams.get('deliveryFilter')),
  );
  const statusFilter = searchParams.get('status');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setDeliveryFilter(parseDeliveryFilter(searchParams.get('deliveryFilter')));
  }, [searchParams]);

  const setFilter = (value: DeliveryFilter) => {
    setDeliveryFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('deliveryFilter');
    } else {
      params.set('deliveryFilter', value);
    }
    const qs = params.toString();
    router.replace(qs ? `/orders?${qs}` : '/orders');
  };

  const load = useCallback(() => {
    setError('');
    setLoading(true);
    adminOrdersApi
      .list({ limit: 100 })
      .then((res) => setOrders(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          setError(getApiErrorMessage(err, 'Failed to load orders. Please try again.'));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (!matchesDeliveryFilter(order, deliveryFilter)) return false;
        if (statusFilter && order.status !== statusFilter) return false;
        return true;
      }),
    [orders, deliveryFilter, statusFilter],
  );

  const unassignedCount = useMemo(
    () => orders.filter((o) => matchesDeliveryFilter(o, 'unassigned')).length,
    [orders],
  );

  const updateStatus = async (id: string, status: string) => {
    const current = orders.find((order) => order.id === id);
    if (!status || current?.status === status) return;

    setUpdatingId(id);
    try {
      await adminOrdersApi.updateStatus(id, status);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update order status.'));
      load();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Orders</h1>
          <p style={{ color: 'var(--muted)', marginTop: 4 }}>
            Manage delivery assignments and track order progress.
          </p>
        </div>
        {unassignedCount > 0 && (
          <span className="badge badge-warning" style={{ fontSize: 13, padding: '8px 14px' }}>
            {unassignedCount} awaiting driver assignment
          </span>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {DELIVERY_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={deliveryFilter === f.value ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ fontSize: 13, padding: '8px 14px' }}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--muted)' }}>Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--muted)' }}>No orders match this filter.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Delivery assignment</th>
                <th>Order status</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Admin action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
                const delivery = getDeliveryAssignmentDisplay(order);
                const options = allowedStatuses(order.status);
                const canChangeStatus = options.length > 1;

                return (
                  <tr
                    key={order.id}
                    className={delivery.needsAction ? 'row-needs-action' : undefined}
                  >
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
                      <span className={`badge ${delivery.badge}`}>{delivery.label}</span>
                    </td>
                    <td>
                      <span className="badge badge-muted">{formatStatusLabel(order.status)}</span>
                    </td>
                    <td>{itemCount}</td>
                    <td>${order.totalAmount.toFixed(2)}</td>
                    <td>{order.paymentStatus}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      {canChangeStatus ? (
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, minWidth: 130 }}
                        >
                          {options.map((s) => (
                            <option key={s} value={s}>
                              {formatStatusLabel(s)}
                            </option>
                          ))}
                        </select>
                      ) : delivery.needsAction ? (
                        <Link href={`/orders/${order.id}`} className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>
                          Assign driver
                        </Link>
                      ) : (
                        <Link href={`/orders/${order.id}`} style={{ fontSize: 12, color: 'var(--info)' }}>
                          View details
                        </Link>
                      )}
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

export default function OrdersPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: 'var(--muted)' }}>Loading orders...</p>}>
      <OrdersPageContent />
    </Suspense>
  );
}
