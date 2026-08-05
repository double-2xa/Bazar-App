export type UserRole = 'normal_user' | 'company' | 'admin' | 'delivery_agent';

export type CompanyStatus = 'pending' | 'approved' | 'rejected';

export type PriceType = 'normal' | 'company';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'accepted'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cash_on_delivery' | 'card';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export type CouponType = 'percentage' | 'fixed';

export interface UserPublic {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  companyProfile?: CompanyProfilePublic | null;
}

export interface CompanyProfilePublic {
  id: string;
  companyName: string;
  vatNumber: string;
  businessAddress: string;
  contactPerson: string;
  companyPhone: string;
  status: CompanyStatus;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  normalPrice: number;
  companyPrice: number;
  stockQuantity: number;
  sku: string;
  brand: string | null;
  imageUrl: string | null;
  images: ProductImage[];
  ratingAverage: number;
  ratingCount: number;
  isFeatured: boolean;
  isActive: boolean;
  category?: Category;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  selectedPriceType: PriceType;
  product?: Product;
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedPriceType: PriceType;
  totalPrice: number;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface DeliveryProofPublic {
  deliveredAt: string;
  deliveredToName: string | null;
  deliveryNote: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  deliveryAgentId?: string | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  customerNote: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  address?: Address;
  user?: Pick<UserPublic, 'id' | 'fullName' | 'email' | 'phone'>;
  deliveryAgent?: Pick<UserPublic, 'id' | 'fullName' | 'phone'>;
  statusHistory?: OrderStatusHistoryEntry[];
  deliveryProof?: DeliveryProofPublic | null;
}

export interface DeliveryAgentSummary {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  activeOrderCount: number;
  createdAt: string;
}

export interface DeliveryOrdersGrouped {
  assigned: Order[];
  accepted: Order[];
  picked_up: Order[];
  on_the_way: Order[];
  delivered: Order[];
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user?: Pick<UserPublic, 'fullName'>;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
}

export interface DashboardOrderNeedingAction {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  customerName: string | null;
}

export interface DashboardBusyAgent {
  id: string;
  fullName: string;
  phone: string | null;
  activeOrderCount: number;
  isActive: boolean;
}

export interface DashboardPendingCompany {
  id: string;
  companyName: string;
  contactPerson: string;
  contactName?: string;
  createdAt: string;
  status?: string;
}

export interface DashboardSummary {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  totalCompanies: number;
  totalDrivers: number;
  todayOrders: number;
  todayRevenue: number;
  deliveredTodayCount: number;
  pendingOrdersCount: number;
  confirmedOrdersCount: number;
  unassignedOrdersCount: number;
  inDeliveryOrdersCount: number;
  codUnpaidAmount: number;
  pendingCompanyApprovalsCount: number;
  lowStockProductsCount: number;
  activeDeliveryAgentsCount: number;
  completedOrders: number;
}

export interface DashboardSalesTrendDay {
  date: string;
  ordersCount: number;
  revenue: number;
  deliveredCount: number;
  codAmount: number;
}

export interface DashboardOrderStatusBreakdown {
  pending: number;
  confirmed: number;
  assigned: number;
  accepted: number;
  picked_up: number;
  on_the_way: number;
  delivered: number;
  cancelled: number;
}

export interface DashboardDeliveryPipeline {
  toPrepare: number;
  readyForDriver: number;
  assigned: number;
  accepted: number;
  pickedUp: number;
  outForDelivery: number;
  deliveredToday: number;
}

export interface DashboardMapOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  latitude: number;
  longitude: number;
  customerName: string | null;
  customerPhone: string | null;
  addressLabel: string | null;
  addressCity: string | null;
  deliveryAgentName: string | null;
  createdAt: string;
}

export interface DashboardRecentOrder {
  id: string;
  orderNumber: string;
  customerName: string | null;
  status: OrderStatus;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  deliveryAgentName: string | null;
}

export interface DashboardTopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
  stockQuantity: number;
}

export interface DashboardAttentionItems {
  needsDriver: number;
  toPrepare: number;
  lowStock: number;
  pendingCompanies: number;
  cashToCollect: number;
}

export interface DashboardLowStockProduct {
  id: string;
  name: string;
  sku?: string;
  stockQuantity: number;
  categoryName?: string | null;
}

export interface DashboardOrdersByCity {
  city: string;
  count: number;
}

/** V3 admin dashboard payload */
export interface DashboardData {
  summary: DashboardSummary;
  salesTrend: {
    days7: DashboardSalesTrendDay[];
    days30: DashboardSalesTrendDay[];
  };
  orderStatusBreakdown: DashboardOrderStatusBreakdown;
  deliveryPipeline: DashboardDeliveryPipeline;
  mapOrders: DashboardMapOrder[];
  mapOrdersWithoutCoordinates: number;
  recentOrders: DashboardRecentOrder[];
  topProducts: DashboardTopProduct[];
  busyDrivers: DashboardBusyAgent[];
  pendingCompanies: DashboardPendingCompany[];
  lowStockProducts: DashboardLowStockProduct[];
  attentionItems: DashboardAttentionItems;
  ordersByCity: DashboardOrdersByCity[];
}

/** @deprecated Use DashboardData — kept for gradual migration */
export interface DashboardStats extends DashboardSummary {
  pendingOrders: number;
  totalCompanyAccounts: number;
  ordersToPrepareCount: number;
  ordersReadyForDriverCount: number;
  recentOrdersNeedingAction: DashboardOrderNeedingAction[];
  busyDeliveryAgents: DashboardBusyAgent[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: UserPublic;
  tokens: AuthTokens;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
