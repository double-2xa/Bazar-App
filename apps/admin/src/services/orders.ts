import type { Order, PaginatedResponse, DeliveryAgentSummary } from '@doublea/shared';
import api from './api';

export type AdminOrdersQuery = {
  page?: number;
  limit?: number;
  status?: string;
};

export type CreateDeliveryAgentInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
};

export const adminOrdersApi = {
  list: (params?: AdminOrdersQuery) =>
    api.get<PaginatedResponse<Order>>('/admin/orders', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Order>(`/admin/orders/${id}`).then((r) => r.data),

  updateStatus: (id: string, status: string, note?: string) =>
    api.patch<Order>(`/admin/orders/${id}/status`, { status, note }).then((r) => r.data),

  assignAgent: (id: string, deliveryAgentId: string) =>
    api
      .patch<Order>(`/admin/orders/${id}/assign-delivery-agent`, { deliveryAgentId })
      .then((r) => r.data),

  unassignAgent: (id: string) =>
    api.patch<Order>(`/admin/orders/${id}/unassign-delivery-agent`).then((r) => r.data),
};

export const deliveryAgentsApi = {
  list: () => api.get<DeliveryAgentSummary[]>('/admin/delivery-agents').then((r) => r.data),

  create: (data: CreateDeliveryAgentInput) =>
    api.post('/admin/delivery-agents', data).then((r) => r.data),
};
