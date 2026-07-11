import {
  CUSTOMER_ORDER_STATUS_LABELS,
  CUSTOMER_PAYMENT_METHOD_LABELS,
  CUSTOMER_PAYMENT_STATUS_LABELS,
} from '@doublea/shared';
import type { OrderStatus } from '@doublea/shared';

export function formatCustomerOrderStatus(status: string): string {
  return CUSTOMER_ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function formatCustomerPaymentMethod(method: string): string {
  return CUSTOMER_PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, ' ');
}

export function formatCustomerPaymentStatus(status: string): string {
  return CUSTOMER_PAYMENT_STATUS_LABELS[status] ?? status;
}

export function getCustomerStatusVariant(
  status: string,
): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'confirmed':
    case 'assigned':
      return 'info';
    case 'accepted':
    case 'picked_up':
    case 'on_the_way':
      return 'primary';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'primary';
  }
}

export function getPaymentStatusVariant(
  status: string,
): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'refunded':
      return 'danger';
    default:
      return 'warning';
  }
}

export function canCustomerCancelOrder(status: OrderStatus): boolean {
  return status === 'pending';
}

export function shouldShowLiveTrackingMessage(status: OrderStatus): boolean {
  return ['assigned', 'accepted', 'picked_up', 'on_the_way'].includes(status);
}

export const LIVE_TRACKING_UNAVAILABLE_MESSAGE =
  'Live tracking will be available when the driver is on the way.';
