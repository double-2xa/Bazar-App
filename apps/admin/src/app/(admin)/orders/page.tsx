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
];

type OrderView = 'active' | 'archive';
type ArchiveStatus = 'all' | 'delivered' | 'cancelled';

function parseOrderView(searchParams: URLSearchParams): OrderView {
  const legacyTerminalFilter =
    searchParams.get('deliveryFilter') === 'delivered' ||
    ['delivered', 'cancelled'].includes(searchParams.get('status') ?? '');
  return searchParams.get('view') === 'archive' || legacyTerminalFilter ? 'archive' : 'active';
}

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
  const orderView = parseOrderView(searchParams);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>(() =>
    parseDeliveryFilter(searchParams.get('deliveryFilter')),
  );
  const statusFilter = searchParams.get('status');
  const archiveStatus: ArchiveStatus =
    statusFilter === 'delivered' || statusFilter === 'cancelled' ? statusFilter : 'all';
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

  const setOrderView = (view: OrderView) => {
    const params = new URLSearchParams();
    if (view === 'archive') params.set('view', 'archive');
    router.replace(params.size ? `/orders?${params}` : '/orders');
  };

  const setArchiveStatus = (status: ArchiveStatus) => {
    const params = new URLSearchParams();
    params.set('view', 'archive');
    if (status !== 'all') params.set('status', status);
    router.replace(`/orders?${params}`);
  };

  const load = useCallback(() => {
    setError('');
    setLoading(true);
    adminOrdersApi
      .list({ limit: 100, scope: orderView })
      .then((res) => setOrders(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          setError(getApiErrorMessage(err, 'Failed to load orders. Please try again.'));
        }
      })
      .finally(() => setLoading(false));
  }, [orderView]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (orderView === 'active' && !matchesDeliveryFilter(order, deliveryFilter)) return false;
        if (statusFilter && order.status !== statusFilter) return false;
        return true;
      }),
    [orders, deliveryFilter, orderView, statusFilter],
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
            {orderView === 'active'
              ? 'Manage delivery assignments and orders currently in progress.'
              : 'Review delivered and cancelled orders without cluttering active operations.'}
          </p>
        </div>
        {orderView === 'active' && unassignedCount > 0 && (
          <span className="badge badge-warning" style={{ fontSize: 13, padding: '8px 14px' }}>
            {unassignedCount} awaiting driver assignment
          </span>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="orders-view-switch" role="tablist" aria-label="Order groups">
        <button type="button" role="tab" aria-selected={orderView === 'active'} className={orderView === 'active' ? 'is-selected' : ''} onClick={() => setOrderView('active')}>
          Active orders
        </button>
        <button type="button" role="tab" aria-selected={orderView === 'archive'} className={orderView === 'archive' ? 'is-selected' : ''} onClick={() => setOrderView('archive')}>
          Completed archive
        </button>
      </div>

      {orderView === 'active' ? (
        <div className="orders-filter-row">
          {DELIVERY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={deliveryFilter === f.value ? 'btn btn-primary' : 'btn btn-outline'}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="orders-filter-row" aria-label="Completed order status">
          {(['all', 'delivered', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={archiveStatus === status ? 'btn btn-primary' : 'btn btn-outline'}
              onClick={() => setArchiveStatus(status)}
            >
              {status === 'all' ? 'All completed' : formatStatusLabel(status)}
            </button>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--muted)' }}>Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="orders-empty-state">
            <strong>{orderView === 'archive' ? 'No completed orders yet' : 'No active orders match this filter'}</strong>
            <p>{orderView === 'archive' ? 'Delivered and cancelled orders will appear here automatically.' : 'Try another operational filter.'}</p>
          </div>
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
                    <td>
                      <div style={{ fontSize: 13 }}>{order.paymentStatus}</div>
                      {order.paymentMethod === 'wish_money' ? (
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Wish Money</div>
                      ) : null}
                    </td>
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
