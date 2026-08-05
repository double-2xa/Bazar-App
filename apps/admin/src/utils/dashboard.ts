import { ADMIN_ORDER_STATUS_LABELS } from '@doublea/shared';
import type { OrderStatus } from '@doublea/shared';
import { BRAND_COLORS } from '@doublea/shared';

export function getOrderMarkerColor(status: string): string {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return BRAND_COLORS.brandYellow;
    case 'assigned':
    case 'accepted':
      return BRAND_COLORS.brandRed;
    case 'picked_up':
    case 'on_the_way':
      return BRAND_COLORS.deepRed;
    case 'delivered':
      return BRAND_COLORS.successGreen;
    default:
      return BRAND_COLORS.charcoal;
  }
}

export function getOrderStatusLabel(status: string): string {
  return ADMIN_ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export const ORDER_STATUS_CHART_COLORS: Record<string, string> = {
  pending: BRAND_COLORS.brandYellow,
  confirmed: '#F5C842',
  assigned: BRAND_COLORS.brandRed,
  accepted: '#E01535',
  picked_up: BRAND_COLORS.deepRed,
  on_the_way: '#5C0A18',
  delivered: BRAND_COLORS.successGreen,
  cancelled: BRAND_COLORS.mutedBrown,
};

export const PIPELINE_STEPS: { key: keyof import('@doublea/shared').DashboardDeliveryPipeline; label: string }[] = [
  { key: 'toPrepare', label: 'To prepare' },
  { key: 'readyForDriver', label: 'Ready for driver' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'pickedUp', label: 'Picked up' },
  { key: 'outForDelivery', label: 'Out for delivery' },
  { key: 'deliveredToday', label: 'Delivered today' },
];

export type OrderStatusKey = OrderStatus;
