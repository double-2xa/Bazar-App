import { ORDER_STATUS_LABELS } from '@doublea/shared';

export type DeliveryFilter =
  | 'all'
  | 'unassigned'
  | 'assigned'
  | 'in_delivery'
  | 'delivered';

export type DeliveryBadgeVariant =
  | 'badge-warning'
  | 'badge-accent'
  | 'badge-brand'
  | 'badge-info'
  | 'badge-success'
  | 'badge-muted'
  | 'badge-danger';

type OrderForDelivery = {
  status: string;
  deliveryAgent?: { fullName: string } | null;
  deliveryAgentId?: string | null;
};

const IN_DELIVERY_STATUSES = ['accepted', 'picked_up', 'on_the_way'] as const;

export function getDeliveryAssignmentDisplay(order: OrderForDelivery): {
  label: string;
  badge: DeliveryBadgeVariant;
  needsAction: boolean;
} {
  const driver = order.deliveryAgent?.fullName;

  if (order.status === 'delivered') {
    return {
      label: driver ? `Delivered · ${driver}` : 'Delivered',
      badge: 'badge-success',
      needsAction: false,
    };
  }

  if (order.status === 'cancelled') {
    return { label: 'Cancelled', badge: 'badge-danger', needsAction: false };
  }

  if (order.status === 'on_the_way') {
    return {
      label: driver ? `On the way · ${driver}` : 'On the way',
      badge: 'badge-brand',
      needsAction: false,
    };
  }

  if (order.status === 'picked_up') {
    return {
      label: driver ? `Picked up · ${driver}` : 'Picked up',
      badge: 'badge-brand',
      needsAction: false,
    };
  }

  if (order.status === 'accepted') {
    return {
      label: driver ? `Accepted · ${driver}` : 'Accepted',
      badge: 'badge-info',
      needsAction: false,
    };
  }

  if (order.status === 'assigned') {
    return {
      label: driver ? `Assigned · ${driver}` : 'Assigned',
      badge: 'badge-accent',
      needsAction: false,
    };
  }

  if ((order.status === 'pending' || order.status === 'confirmed') && !order.deliveryAgentId) {
    return {
      label: 'Unassigned',
      badge: 'badge-warning',
      needsAction: true,
    };
  }

  return {
    label: ORDER_STATUS_LABELS[order.status] ?? order.status,
    badge: 'badge-muted',
    needsAction: false,
  };
}

export function matchesDeliveryFilter(order: OrderForDelivery, filter: DeliveryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unassigned') {
    return (order.status === 'pending' || order.status === 'confirmed') && !order.deliveryAgentId;
  }
  if (filter === 'assigned') return order.status === 'assigned';
  if (filter === 'in_delivery') {
    return IN_DELIVERY_STATUSES.includes(order.status as (typeof IN_DELIVERY_STATUSES)[number]);
  }
  if (filter === 'delivered') return order.status === 'delivered';
  return true;
}

export function canAssignDriver(status: string): boolean {
  return ['pending', 'confirmed', 'assigned', 'accepted'].includes(status);
}

export function canUnassignDriver(status: string): boolean {
  return ['assigned', 'accepted'].includes(status);
}

export function formatStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: string | string[] } } }).response?.data;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}
