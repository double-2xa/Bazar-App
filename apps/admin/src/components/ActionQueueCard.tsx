import Link from 'next/link';
import type { ReactNode } from 'react';

export type ActionQueueTone = 'default' | 'attention' | 'danger' | 'success' | 'muted';

type ActionQueueCardProps = {
  title: string;
  count: ReactNode;
  description: string;
  href: string;
  actionLabel?: string;
  tone?: ActionQueueTone;
};

export default function ActionQueueCard({
  title,
  count,
  description,
  href,
  actionLabel = 'Open',
  tone = 'default',
}: ActionQueueCardProps) {
  return (
    <Link href={href} className={`action-queue-card action-queue-card--${tone}`}>
      <div className="action-queue-card__header">
        <span className="action-queue-card__title">{title}</span>
        <span className="action-queue-card__count">{count}</span>
      </div>
      <p className="action-queue-card__desc">{description}</p>
      <span className="action-queue-card__action">{actionLabel} →</span>
    </Link>
  );
}
