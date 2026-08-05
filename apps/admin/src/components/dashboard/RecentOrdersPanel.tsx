import Link from 'next/link';
import type { DashboardRecentOrder } from '@doublea/shared';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { formatCurrency, formatDateTime } from '@/utils/format';
import SectionHeader from './SectionHeader';

type RecentOrdersPanelProps = {
  orders: DashboardRecentOrder[];
};

export default function RecentOrdersPanel({ orders }: RecentOrdersPanelProps) {
  return (
    <div className="dash-panel">
      <SectionHeader
        title="Recent orders"
        subtitle="Latest customer activity"
        action={
          <Link href="/orders" className="dash-panel__link">
            All orders
          </Link>
        }
      />
      {orders.length === 0 ? (
        <EmptyState message="No orders yet." />
      ) : (
        <div className="dash-table-wrap">
          <table className="table dash-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orders/${o.id}`} className="dash-table__link">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td>{o.customerName ?? '—'}</td>
                  <td>
                    <StatusBadge status={o.status} kind="order" />
                  </td>
                  <td>
                    <StatusBadge status={o.paymentStatus} kind="payment" />
                  </td>
                  <td className="dash-table__amount">{formatCurrency(o.totalAmount)}</td>
                  <td className="dash-table__muted">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
