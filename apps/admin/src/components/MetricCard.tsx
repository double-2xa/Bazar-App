import Link from 'next/link';
import type { ReactNode } from 'react';

export type MetricTone = 'default' | 'attention' | 'danger' | 'success' | 'muted';

type MetricCardProps = {
  title: string;
  value: ReactNode;
  helper?: string;
  tone?: MetricTone;
  href?: string;
};

export default function MetricCard({
  title,
  value,
  helper,
  tone = 'default',
  href,
}: MetricCardProps) {
  const className = `metric-card metric-card--${tone}${href ? ' metric-card--link' : ''}`;

  const content = (
    <>
      <div className="metric-card__title">{title}</div>
      <div className="metric-card__value">{value}</div>
      {helper ? <div className="metric-card__helper">{helper}</div> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
