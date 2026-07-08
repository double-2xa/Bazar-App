'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import type { DashboardStats } from '@doublea/shared';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setStats(r.data)).catch(console.error);
  }, []);

  const cards = stats
    ? [
        { label: 'Total Orders', value: stats.totalOrders, color: 'var(--info)' },
        { label: 'Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, color: 'var(--success)' },
        { label: 'Pending Orders', value: stats.pendingOrders, color: 'var(--warning)' },
        { label: 'Completed', value: stats.completedOrders, color: 'var(--success)' },
        { label: 'Users', value: stats.totalUsers, color: 'var(--text)' },
        { label: 'Companies', value: stats.totalCompanyAccounts, color: 'var(--primary)' },
        { label: 'Products', value: stats.totalProducts, color: 'var(--secondary)' },
      ]
    : [];

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 32 }}>Welcome to DoubleA Commerce admin panel</p>

      <div className="stat-grid">
        {cards.map((card) => (
          <div key={card.label} className="card stat-card">
            <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {!stats && <p style={{ color: 'var(--muted)' }}>Loading statistics...</p>}
    </div>
  );
}
