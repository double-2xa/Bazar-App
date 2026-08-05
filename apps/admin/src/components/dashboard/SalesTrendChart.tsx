'use client';

import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardSalesTrendDay } from '@doublea/shared';
import { formatCurrency, formatShortDate } from '@/utils/format';
import ChartCard from './ChartCard';

type SalesTrendChartProps = {
  days7: DashboardSalesTrendDay[];
  days30: DashboardSalesTrendDay[];
};

export default function SalesTrendChart({ days7, days30 }: SalesTrendChartProps) {
  const [range, setRange] = useState<'7' | '30'>('7');
  const data = range === '7' ? days7 : days30;

  const chartData = data.map((d) => ({
    ...d,
    label: formatShortDate(d.date),
  }));

  return (
    <ChartCard
      title="Sales trend"
      subtitle="Orders placed and revenue from deliveries"
      headerExtra={
        <div className="dash-tabs">
          <button
            type="button"
            className={`dash-tabs__btn${range === '7' ? ' dash-tabs__btn--active' : ''}`}
            onClick={() => setRange('7')}
          >
            7 days
          </button>
          <button
            type="button"
            className={`dash-tabs__btn${range === '30' ? ' dash-tabs__btn--active' : ''}`}
            onClick={() => setRange('30')}
          >
            30 days
          </button>
        </div>
      }
    >
      <div className="dash-chart-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2E9D58" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2E9D58" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C8102E" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#C8102E" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,31,31,0.06)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B4A2D' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="orders" tick={{ fontSize: 11, fill: '#6B4A2D' }} axisLine={false} tickLine={false} width={28} />
            <YAxis
              yAxisId="revenue"
              orientation="right"
              tick={{ fontSize: 11, fill: '#6B4A2D' }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: '1px solid rgba(31,31,31,0.08)',
                fontSize: 13,
              }}
              formatter={(value, name) => {
                const num = typeof value === 'number' ? value : Number(value ?? 0);
                if (name === 'Revenue') return [formatCurrency(num), name];
                return [num, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              yAxisId="orders"
              type="monotone"
              dataKey="ordersCount"
              name="Orders"
              stroke="#C8102E"
              fill="url(#ordersGrad)"
              strokeWidth={2}
            />
            <Area
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#2E9D58"
              fill="url(#revenueGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
