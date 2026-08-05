'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardOrderStatusBreakdown } from '@doublea/shared';
import { ADMIN_ORDER_STATUS_LABELS } from '@doublea/shared';
import { ORDER_STATUS_CHART_COLORS } from '@/utils/dashboard';
import ChartCard from './ChartCard';

type OrderStatusChartProps = {
  breakdown: DashboardOrderStatusBreakdown;
};

export default function OrderStatusChart({ breakdown }: OrderStatusChartProps) {
  const data = Object.entries(breakdown)
    .map(([status, count]) => ({
      status,
      label: ADMIN_ORDER_STATUS_LABELS[status] ?? status,
      count,
    }))
    .filter((d) => d.count > 0);

  return (
    <ChartCard title="Order status" subtitle="Live counts across all orders">
      <div className="dash-chart-wrap dash-chart-wrap--compact">
        {data.length === 0 ? (
          <p className="dash-chart-empty">No orders yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(31,31,31,0.06)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6B4A2D' }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={100}
                tick={{ fontSize: 11, fill: '#1F1F1F' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid rgba(31,31,31,0.08)', fontSize: 13 }}
              />
              <Bar dataKey="count" name="Orders" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={ORDER_STATUS_CHART_COLORS[entry.status] ?? '#6B4A2D'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
