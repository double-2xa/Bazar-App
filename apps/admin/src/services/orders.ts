import type { Order, PaginatedResponse, DeliveryAgentSummary } from '@doublea/shared';
import api from './api';

export type AdminOrdersQuery = {
  page?: number;
  limit?: number;
  status?: string;
  scope?: 'active' | 'archive';
  paymentMethod?: 'cash_on_delivery' | 'wish_money' | 'card';
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
};

export type CreateDeliveryAgentInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
};

export type UpdateDeliveryAgentInput = {
  email: string;
  fullName: string;
  phone?: string;
  password?: string;
  isActive: boolean;
};

export const adminOrdersApi = {
  list: (params?: AdminOrdersQuery) =>
    api.get<PaginatedResponse<Order>>('/admin/orders', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Order>(`/admin/orders/${id}`).then((r) => r.data),

  downloadInvoice: (id: string) =>
    api.get<Blob>(`/orders/${id}/invoice`, { responseType: 'blob' }).then((r) => r.data),

  updateStatus: (id: string, status: string, note?: string) =>
    api.patch<Order>(`/admin/orders/${id}/status`, { status, note }).then((r) => r.data),

  updatePaymentStatus: (id: string, paymentStatus: 'unpaid' | 'paid' | 'refunded') =>
    api
      .patch<Order>(`/admin/orders/${id}/payment-status`, { paymentStatus })
      .then((r) => r.data),

  assignAgent: (id: string, deliveryAgentId: string) =>
    api
      .patch<Order>(`/admin/orders/${id}/assign-delivery-agent`, { deliveryAgentId })
      .then((r) => r.data),

  unassignAgent: (id: string) =>
    api.patch<Order>(`/admin/orders/${id}/unassign-delivery-agent`).then((r) => r.data),

  prepareItemUnit: (orderId: string, itemId: string, decision: 'prepared' | 'unavailable') =>
    api.patch<Order>(`/admin/orders/${orderId}/items/${itemId}/preparation`, { decision }).then((r) => r.data),

  prepareAllItems: (orderId: string) =>
    api.post<Order>(`/admin/orders/${orderId}/items/prepare-all`, {}).then((r) => r.data),
};

export const deliveryAgentsApi = {
  list: () => api.get<DeliveryAgentSummary[]>('/admin/delivery-agents').then((r) => r.data),

  create: (data: CreateDeliveryAgentInput) =>
    api.post('/admin/delivery-agents', data).then((r) => r.data),

  update: (id: string, data: UpdateDeliveryAgentInput) =>
    api.patch(`/admin/delivery-agents/${id}`, data).then((r) => r.data),
};
