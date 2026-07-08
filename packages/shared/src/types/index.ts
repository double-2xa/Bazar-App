export type UserRole = 'normal_user' | 'company' | 'admin' | 'delivery_agent';

export type CompanyStatus = 'pending' | 'approved' | 'rejected';

export type PriceType = 'normal' | 'company';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
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

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
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

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  totalUsers: number;
  totalCompanyAccounts: number;
  totalProducts: number;
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
