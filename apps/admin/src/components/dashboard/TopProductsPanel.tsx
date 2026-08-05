import Link from 'next/link';
import type { DashboardTopProduct, DashboardLowStockProduct } from '@doublea/shared';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/utils/format';
import SectionHeader from './SectionHeader';

type TopProductsPanelProps = {
  topProducts: DashboardTopProduct[];
  lowStockProducts: DashboardLowStockProduct[];
};

export default function TopProductsPanel({ topProducts, lowStockProducts }: TopProductsPanelProps) {
  return (
    <div className="dash-panel dash-panel--split">
      <div>
        <SectionHeader title="Top products" subtitle="By quantity sold (all time)" />
        {topProducts.length === 0 ? (
          <EmptyState message="No product sales data yet." />
        ) : (
          <ul className="dash-list">
            {topProducts.map((p) => (
              <li key={p.productId} className="dash-list__item">
                <div>
                  <div className="dash-list__primary">{p.name}</div>
                  <div className="dash-list__secondary">
                    {p.quantitySold} sold · {formatCurrency(p.revenue)}
                  </div>
                </div>
                <span className="dash-list__muted">{p.stockQuantity} in stock</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <SectionHeader
          title="Low stock"
          subtitle="At or below threshold"
          action={
            <Link href="/products" className="dash-panel__link">
              Products
            </Link>
          }
        />
        {lowStockProducts.length === 0 ? (
          <EmptyState message="Stock levels look healthy." />
        ) : (
          <ul className="dash-list">
            {lowStockProducts.map((p) => (
              <li key={p.id} className="dash-list__item">
                <div>
                  <div className="dash-list__primary">{p.name}</div>
                  <div className="dash-list__secondary">
                    {p.categoryName ?? 'Uncategorized'}
                    {p.sku ? ` · ${p.sku}` : ''}
                  </div>
                </div>
                <span className="dash-list__badge dash-list__badge--danger">{p.stockQuantity} left</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
