import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatTodayLabel } from '@/utils/format';

type HeroKpi = {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'attention' | 'success';
};

type DashboardHeroProps = {
  onRefresh: () => void;
  refreshing: boolean;
  kpis: HeroKpi[];
};

export default function DashboardHero({ onRefresh, refreshing, kpis }: DashboardHeroProps) {
  return (
    <section className="dash-hero">
      <div className="dash-hero__content">
        <div className="dash-hero__text">
          <span className="dash-hero__eyebrow">Nice Price Bazar · Lebanon</span>
          <h1 className="dash-hero__title">Lebanon Operations Dashboard</h1>
          <p className="dash-hero__subtitle">
            Monitor orders, deliveries, cash collection, drivers, and stock across Nice Price Bazar.
          </p>
          <div className="dash-hero__meta">
            <span>{formatTodayLabel()}</span>
            <span className="dash-hero__dot">·</span>
            <span>Asia/Beirut</span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary dash-hero__refresh"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>
      <div className="dash-hero__kpis">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`dash-hero-kpi dash-hero-kpi--${kpi.tone ?? 'default'}`}>
            <span className="dash-hero-kpi__label">{kpi.label}</span>
            <span className="dash-hero-kpi__value">{kpi.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardWidget({
  title,
  value,
  href,
  tone = 'default',
  compact = false,
}: {
  title: string;
  value: ReactNode;
  href?: string;
  tone?: 'default' | 'attention' | 'success' | 'danger' | 'muted';
  compact?: boolean;
}) {
  const className = `dash-widget dash-widget--${tone}${compact ? ' dash-widget--compact' : ''}`;
  const inner = (
    <>
      <span className="dash-widget__title">{title}</span>
      <span className="dash-widget__value">{value}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
