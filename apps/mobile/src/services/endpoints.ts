import api from './api';
import type {
  Product,
  Category,
  Order,
  Address,
  UserPublic,
  LoginResponse,
  DeliveryOrdersGrouped,
  AppNotification,
} from '@doublea/shared';

export type DeliveryProofInput = {
  deliveredToName?: string;
  deliveryNote?: string;
  agentSignatureDataUrl: string;
  clientSignatureDataUrl: string;
  latitude?: number;
  longitude?: number;
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),
  googleLogin: (idToken: string) =>
    api.post<LoginResponse>('/auth/google', { idToken }).then((r) => r.data),
  register: (data: { email: string; password: string; fullName: string; phone?: string }) =>
    api.post<LoginResponse>('/auth/register', data).then((r) => r.data),
  registerCompany: (data: Record<string, string>) =>
    api.post<LoginResponse>('/auth/register-company', data).then((r) => r.data),
  me: () => api.get<UserPublic>('/auth/me').then((r) => r.data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),
};

export const productsApi = {
  getAll: (params?: Record<string, string | number | boolean>) =>
    api.get<{ data: Product[]; total: number }>('/products', { params }).then((r) => r.data),
  getById: (id: string) => api.get<Product>(`/products/${id}`).then((r) => r.data),
  getBySlug: (slug: string) => api.get<Product>(`/products/slug/${slug}`).then((r) => r.data),
  getReviews: (id: string) => api.get(`/products/${id}/reviews`).then((r) => r.data),
};

export const categoriesApi = {
  getAll: () => api.get<Category[]>('/categories').then((r) => r.data),
};

export const bannersApi = {
  getAll: () => api.get('/banners').then((r) => r.data),
};

export const cartApi = {
  get: () => api.get('/cart').then((r) => r.data),
  addItem: (productId: string, quantity: number, selectedPriceType?: string) =>
    api.post('/cart/items', { productId, quantity, selectedPriceType }).then((r) => r.data),
  updateItem: (id: string, quantity: number) =>
    api.patch(`/cart/items/${id}`, { quantity }).then((r) => r.data),
  removeItem: (id: string) => api.delete(`/cart/items/${id}`).then((r) => r.data),
  clear: () => api.delete('/cart/clear').then((r) => r.data),
};

export const addressesApi = {
  getAll: () => api.get<Address[]>('/addresses').then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post<Address>('/addresses', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Address>(`/addresses/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/addresses/${id}`).then((r) => r.data),
  setDefault: (id: string) => api.patch(`/addresses/${id}/default`).then((r) => r.data),
};

export const locationsApi = {
  getHierarchy: () =>
    api.get<import('@doublea/shared').LebanonHierarchy>('/locations/lebanon/hierarchy').then((r) => r.data),
  getSettlements: (params?: {
    governorate?: string;
    district?: string;
    q?: string;
    limit?: number;
  }) =>
    api
      .get<{ total: number; data: import('@doublea/shared').LebanonSettlement[] }>(
        '/locations/lebanon/settlements',
        { params },
      )
      .then((r) => r.data),
};

export const ordersApi = {
  create: (data: Record<string, unknown>) => api.post<Order>('/orders', data).then((r) => r.data),
  getMyOrders: () => api.get<Order[]>('/orders/my-orders').then((r) => r.data),
  getById: (id: string) => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  cancel: (id: string) => api.patch(`/orders/${id}/cancel`).then((r) => r.data),
  getDeliveryQuote: (addressId: string) =>
    api
      .get<{
        deliveryFee: number;
        distanceKm: number | null;
        placeName: string | null;
        method: string;
      }>('/orders/delivery-quote', { params: { addressId } })
      .then((r) => r.data),
};

export const wishlistApi = {
  getAll: () => api.get('/wishlist').then((r) => r.data),
  add: (productId: string) => api.post('/wishlist', { productId }).then((r) => r.data),
  remove: (productId: string) => api.delete(`/wishlist/${productId}`).then((r) => r.data),
};

export const deliveryApi = {
  getOrders: () =>
    api.get<DeliveryOrdersGrouped>('/delivery/orders').then((r) => r.data),

  getAvailableOrders: () =>
    api.get<Order[]>('/delivery/orders/available').then((r) => r.data),

  getNotifications: (unreadOnly = false) =>
    api
      .get<AppNotification[]>('/delivery/notifications', {
        params: unreadOnly ? { unreadOnly: true } : undefined,
      })
      .then((r) => r.data),

  markNotificationRead: (id: string) =>
    api.patch(`/delivery/notifications/${id}/read`).then((r) => r.data),

  lockOrder: (id: string) =>
    api.patch<Order>(`/delivery/orders/${id}/lock`).then((r) => r.data),

  getOrder: (id: string) =>
    api.get<Order>(`/delivery/orders/${id}`).then((r) => r.data),

  accept: (id: string) =>
    api.patch<Order>(`/delivery/orders/${id}/accept`).then((r) => r.data),

  reject: (id: string, data?: { reason?: string }) =>
    api.patch(`/delivery/orders/${id}/reject`, data ?? {}).then((r) => r.data),

  markPickedUp: (id: string) =>
    api.patch<Order>(`/delivery/orders/${id}/picked-up`).then((r) => r.data),

  markOnTheWay: (id: string) =>
    api.patch<Order>(`/delivery/orders/${id}/on-the-way`).then((r) => r.data),

  markDelivered: (id: string, data?: DeliveryProofInput) =>
    api.patch<Order>(`/delivery/orders/${id}/delivered`, data ?? {}).then((r) => r.data),
};

export const reviewsApi = {
  create: (data: { productId: string; orderId: string; rating: number; comment?: string }) =>
    api.post('/reviews', data).then((r) => r.data),
};
