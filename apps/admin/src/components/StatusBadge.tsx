import {
  ADMIN_ORDER_STATUS_LABELS,
  ADMIN_PAYMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
} from '@doublea/shared';

type StatusKind = 'order' | 'payment' | 'company' | 'generic';

type StatusBadgeProps = {
  status: string;
  kind?: StatusKind;
};

function labelFor(status: string, kind: StatusKind): string {
  if (kind === 'order') {
    return ADMIN_ORDER_STATUS_LABELS[status] ?? ORDER_STATUS_LABELS[status] ?? status;
  }
  if (kind === 'payment') {
    return ADMIN_PAYMENT_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  }
  if (kind === 'company') {
    if (status === 'pending') return 'Waiting approval';
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
  }
  return status.replace(/_/g, ' ');
}

function toneClass(status: string, kind: StatusKind): string {
  if (kind === 'order') {
    if (status === 'pending' || status === 'confirmed') return 'badge badge-attention';
    if (status === 'delivered') return 'badge badge-success';
    if (status === 'cancelled') return 'badge badge-danger';
    if (status === 'on_the_way' || status === 'picked_up') return 'badge badge-brand';
    return 'badge badge-muted';
  }
  if (kind === 'payment') {
    if (status === 'unpaid') return 'badge badge-attention';
    if (status === 'paid') return 'badge badge-success';
    if (status === 'refunded') return 'badge badge-muted';
  }
  if (kind === 'company') {
    if (status === 'pending') return 'badge badge-attention';
    if (status === 'approved') return 'badge badge-success';
    if (status === 'rejected') return 'badge badge-danger';
  }
  return 'badge badge-muted';
}

export default function StatusBadge({ status, kind = 'generic' }: StatusBadgeProps) {
  return <span className={toneClass(status, kind)}>{labelFor(status, kind)}</span>;
}
