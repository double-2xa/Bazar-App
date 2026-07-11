import { ORDER_STATUS_LABELS } from '@doublea/shared';
import type { OrderStatus } from '@doublea/shared';

export const DRIVER_SECTIONS = [
  { key: 'assigned' as const, label: 'New assigned', icon: 'clipboard-outline' as const, badgeVariant: 'warning' as const },
  { key: 'accepted' as const, label: 'Accepted', icon: 'checkmark-circle-outline' as const, badgeVariant: 'info' as const },
  { key: 'picked_up' as const, label: 'Picked up', icon: 'cube-outline' as const, badgeVariant: 'primary' as const },
  { key: 'on_the_way' as const, label: 'On the way', icon: 'navigate-outline' as const, badgeVariant: 'primary' as const },
] as const;

export type DriverActiveGroupKey = (typeof DRIVER_SECTIONS)[number]['key'];

export const DRIVER_WORKFLOW_STEPS: OrderStatus[] = [
  'assigned',
  'accepted',
  'picked_up',
  'on_the_way',
  'delivered',
];

export function formatDriverStatus(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function getActiveDeliveryCount(groups?: {
  assigned?: unknown[];
  accepted?: unknown[];
  picked_up?: unknown[];
  on_the_way?: unknown[];
}): number {
  if (!groups) return 0;
  return (
    (groups.assigned?.length ?? 0) +
    (groups.accepted?.length ?? 0) +
    (groups.picked_up?.length ?? 0) +
    (groups.on_the_way?.length ?? 0)
  );
}

export function getWorkflowStepIndex(status: string): number {
  const idx = DRIVER_WORKFLOW_STEPS.indexOf(status as OrderStatus);
  return idx >= 0 ? idx : 0;
}
