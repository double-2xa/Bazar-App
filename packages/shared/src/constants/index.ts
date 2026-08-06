export const USER_ROLES = ['normal_user', 'company', 'admin', 'delivery_agent'] as const;

export const BRAND = {
  shopName: 'Nice Price Bazar',
  internalName: 'DoubleA',
  tagline: 'Affordable. Local. Practical.',
  adminPanelTitle: 'Nice Price Bazar Admin',
} as const;

export const BRAND_COLORS = {
  brandRed: '#C8102E',
  brandYellow: '#FFD21E',
  deepRed: '#7A1020',
  warmCream: '#FFF8E7',
  charcoal: '#1F1F1F',
  mutedBrown: '#6B4A2D',
  successGreen: '#2E9D58',
  warningOrange: '#F59E0B',
} as const;

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'assigned',
  'accepted',
  'picked_up',
  'on_the_way',
  'delivered',
  'cancelled',
] as const;

/** Admin manual status changes — cannot skip delivery flow or jump to delivered */
export const ADMIN_ORDER_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  assigned: [],
  accepted: [],
  picked_up: [],
  on_the_way: [],
  delivered: [],
  cancelled: [],
};

/** Customer-facing delivery progress steps (excludes cancelled) */
export const ORDER_TRACKING_STEPS = [
  'pending',
  'confirmed',
  'assigned',
  'accepted',
  'picked_up',
  'on_the_way',
  'delivered',
] as const;

/** Human-readable labels for order statuses */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  accepted: 'Accepted',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Admin / shop-floor labels (operations board language) */
export const ADMIN_ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'To prepare',
  confirmed: 'Ready for driver',
  assigned: 'Assigned',
  accepted: 'Accepted by driver',
  picked_up: 'Picked up',
  on_the_way: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ADMIN_PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Cash pending',
  paid: 'Paid',
  refunded: 'Refunded',
};

export const ADMIN_OPS_LABELS = {
  needsDriver: 'Needs driver',
  toPrepare: 'To prepare',
  outForDelivery: 'Out for delivery',
  cashToCollect: 'Cash to collect',
  waitingApproval: 'Waiting approval',
  lowStock: 'Low stock',
} as const;

/** TODO: make configurable via settings API later */
export const LOW_STOCK_THRESHOLD = 5;

/** Lebanon — admin dashboard map & timezone */
export const LEBANON_MAP = {
  centerLat: 33.8547,
  centerLng: 35.8623,
  defaultZoom: 8,
  /** SW / NE bounds for maxBounds */
  boundsSouthWest: [33.0, 35.0] as const,
  boundsNorthEast: [34.7, 36.6] as const,
  timezone: 'Asia/Beirut',
} as const;

/** Customer-facing order status labels (shopper app) */
export const CUSTOMER_ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Order placed',
  confirmed: 'Preparing your order',
  assigned: 'Assigned to delivery',
  accepted: 'Accepted by driver',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Shorter labels for customer progress stepper */
export const CUSTOMER_ORDER_STEP_LABELS: Record<string, string> = {
  pending: 'Placed',
  confirmed: 'Preparing',
  assigned: 'Assigned',
  accepted: 'Driver accepted',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
  delivered: 'Delivered',
};

export const CUSTOMER_PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: 'Cash on delivery',
  card: 'Card',
};

export const CUSTOMER_PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  refunded: 'Refunded',
};

/** Active delivery statuses grouped for driver dashboard */
export const DRIVER_ORDER_GROUPS = [
  'assigned',
  'accepted',
  'picked_up',
  'on_the_way',
  'delivered',
] as const;

export const PAYMENT_METHODS = ['cash_on_delivery', 'card'] as const;

export const DEFAULT_DELIVERY_FEE = 5.99;
export const DEFAULT_TAX_RATE = 0.08;

export {
  STORE_ORIGIN,
  LEBANON_PLACES,
  DELIVERY_FEE_FORMULA,
  haversineKm,
  findLebanonPlaceByCity,
  resolveDeliveryDestination,
  calculateDeliveryFee,
} from './delivery';
export type { LebanonPlace, DeliveryFeeInput, DeliveryFeeQuote } from './delivery';

export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@doublea.com', password: 'Admin123!' },
  normalUser: { email: 'user@doublea.com', password: 'User123!' },
  companyUser: { email: 'company@doublea.com', password: 'Company123!' },
  deliveryAgent: { email: 'delivery@doublea.com', password: 'Delivery123!' },
} as const;
