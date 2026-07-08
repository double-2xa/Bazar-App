export const USER_ROLES = ['normal_user', 'company', 'admin', 'delivery_agent'] as const;

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'assigned',
  'picked_up',
  'on_the_way',
  'delivered',
  'cancelled',
] as const;

export const PAYMENT_METHODS = ['cash_on_delivery', 'card'] as const;

export const DEFAULT_DELIVERY_FEE = 5.99;
export const DEFAULT_TAX_RATE = 0.08;

export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@doublea.com', password: 'Admin123!' },
  normalUser: { email: 'user@doublea.com', password: 'User123!' },
  companyUser: { email: 'company@doublea.com', password: 'Company123!' },
  deliveryAgent: { email: 'delivery@doublea.com', password: 'Delivery123!' },
} as const;
