import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

export type CompanyNotifyStatus = 'approved' | 'rejected';

export type CompanyNotifyRecipient = {
  email: string;
  phone: string | null;
  fullName: string;
  companyName: string;
};

export const NOTIFICATION_TYPES = {
  deliveryOrderAvailable: 'delivery_order_available',
  companyAccountApproved: 'company_account_approved',
  companyAccountRejected: 'company_account_rejected',
  orderStatusChanged: 'order_status_changed',
  orderAssigned: 'order_assigned',
  orderCancelled: 'order_cancelled',
} as const;

/**
 * In-app + outbound notification hooks.
 * Push/email/WhatsApp providers are stubbed for later wiring.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

  constructor(private prisma: PrismaService) {}

  async registerPushToken(userId: string, token: string, platform: string, deviceId?: string) {
    if (!Expo.isExpoPushToken(token)) throw new Error('Invalid Expo push token');
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform, deviceId, isActive: true },
      update: { userId, platform, deviceId, isActive: true, lastSeenAt: new Date() },
      select: { id: true, platform: true, lastSeenAt: true },
    });
  }

  async unregisterPushToken(userId: string, token: string) {
    await this.prisma.pushToken.updateMany({ where: { userId, token }, data: { isActive: false } });
    return { success: true };
  }

  private async sendPush(userIds: string[], title: string, body: string, data: Record<string, unknown>) {
    if (userIds.length === 0) return;
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: [...new Set(userIds)] }, isActive: true },
      select: { token: true },
    });
    const messages: ExpoPushMessage[] = tokens
      .filter(({ token }) => Expo.isExpoPushToken(token))
      .map(({ token }) => ({ to: token, title, body, data, sound: 'default', channelId: 'orders', priority: 'high' }));
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        await this.disableRejectedTokens(chunk, tickets);
        const receipts = tickets.flatMap((ticket, index) =>
          ticket.status === 'ok'
            ? [{ ticketId: ticket.id, token: chunk[index].to as string, checkAfter: new Date(Date.now() + 15 * 60 * 1000) }]
            : [],
        );
        if (receipts.length) await this.prisma.pushReceipt.createMany({ data: receipts, skipDuplicates: true });
      } catch (error) {
        this.logger.error(`Expo push batch failed: ${(error as Error).message}`);
      }
    }
  }

  private async disableRejectedTokens(messages: ExpoPushMessage[], tickets: ExpoPushTicket[]) {
    const invalid = tickets.flatMap((ticket, index) =>
      ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
        ? [messages[index].to as string]
        : [],
    );
    if (invalid.length) await this.prisma.pushToken.updateMany({ where: { token: { in: invalid } }, data: { isActive: false } });
  }

  private async createAndPush(userIds: string[], type: string, title: string, body: string, data: Prisma.InputJsonValue) {
    const recipients = [...new Set(userIds)];
    if (!recipients.length) return;
    await this.prisma.notification.createMany({
      data: recipients.map((userId) => ({ userId, type, title, body, data })),
    });
    await this.sendPush(recipients, title, body, data as Record<string, unknown>);
  }

  async notifyOrderStatus(orderId: string, status: OrderStatus, options?: { assignedAgentId?: string | null; previousAgentId?: string | null }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, userId: true, deliveryAgentId: true },
    });
    if (!order) return;
    const labels: Partial<Record<OrderStatus, string>> = {
      confirmed: 'Your order is confirmed and being prepared.',
      assigned: 'A delivery driver has been assigned to your order.',
      accepted: 'Your driver accepted the delivery.',
      picked_up: 'Your order was picked up.',
      on_the_way: 'Your order is on the way.',
      delivered: 'Your order was delivered successfully.',
      cancelled: 'Your order was cancelled.',
    };
    const body = labels[status];
    if (!body) return;
    const adminIds = status === 'delivered' || status === 'cancelled'
      ? (await this.prisma.user.findMany({ where: { role: 'admin', isActive: true }, select: { id: true } })).map((u) => u.id)
      : [];
    if (status === 'assigned') {
      await this.createAndPush([order.userId], NOTIFICATION_TYPES.orderAssigned, `Order ${order.orderNumber}`, body, {
        orderId, orderNumber: order.orderNumber, status, route: `/order/${orderId}`,
      });
      const agentId = options?.assignedAgentId || order.deliveryAgentId;
      if (agentId) await this.createAndPush([agentId], NOTIFICATION_TYPES.orderAssigned, 'Delivery assigned', `Order ${order.orderNumber} was assigned to you.`, {
        orderId, orderNumber: order.orderNumber, status, route: `/delivery-order/${orderId}`,
      });
      return;
    }
    const recipients = [order.userId, ...adminIds];
    await this.createAndPush(
      recipients,
      status === 'cancelled' ? NOTIFICATION_TYPES.orderCancelled : NOTIFICATION_TYPES.orderStatusChanged,
      `Order ${order.orderNumber}`,
      body,
      { orderId, orderNumber: order.orderNumber, status, route: `/order/${orderId}` },
    );
    const previousAgentId = status === 'cancelled' ? options?.previousAgentId || order.deliveryAgentId : null;
    if (previousAgentId) await this.createAndPush([previousAgentId], NOTIFICATION_TYPES.orderCancelled, `Order ${order.orderNumber}`, body, {
      orderId, orderNumber: order.orderNumber, status, route: `/delivery-order/${orderId}`,
    });
  }

  async notifyCompanyStatusChange(
    recipient: CompanyNotifyRecipient & { userId: string },
    status: CompanyNotifyStatus,
  ): Promise<void> {
    const approved = status === 'approved';
    const title = approved ? 'Wholesale account approved' : 'Wholesale application update';
    const message = approved
      ? `Your wholesale account for ${recipient.companyName} is now activated. You can sign in to shop.`
      : `Your wholesale application for ${recipient.companyName} was not approved.`;

    await this.prisma.notification.create({
      data: {
        userId: recipient.userId,
        type: approved
          ? NOTIFICATION_TYPES.companyAccountApproved
          : NOTIFICATION_TYPES.companyAccountRejected,
        title,
        body: message,
        data: { status, companyName: recipient.companyName },
      },
    });

    await this.sendPush([recipient.userId], title, message, { status, route: '/company-profile' });

    // TODO(discuss): wire email provider and/or WhatsApp Business API
    this.logger.log(
      `[STUB notify] status=${status} email=${recipient.email} phone=${recipient.phone ?? 'n/a'} name=${recipient.fullName} message="${message}"`,
    );
  }

  /**
   * When a customer places an order, notify all active delivery agents
   * so they can lock (claim) it.
   */
  async notifyDeliveryAgentsNewOrder(order: {
    id: string;
    orderNumber: string;
    address?: { city?: string | null; street?: string | null } | null;
    totalAmount?: unknown;
  }): Promise<number> {
    const agents = await this.prisma.user.findMany({
      where: { role: { in: ['delivery_agent', 'admin'] }, isActive: true },
      select: { id: true, fullName: true, email: true, phone: true },
    });

    if (agents.length === 0) {
      this.logger.warn(`No active delivery agents to notify for order ${order.orderNumber}`);
      return 0;
    }

    const place =
      order.address?.city || order.address?.street
        ? [order.address.street, order.address.city].filter(Boolean).join(', ')
        : 'delivery address';

    const title = 'New order available';
    const body = `${order.orderNumber} is ready to lock · ${place}`;
    const data: Prisma.InputJsonValue = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      action: 'lock',
    };

    await this.prisma.notification.createMany({
      data: agents.map((agent) => ({
        userId: agent.id,
        type: NOTIFICATION_TYPES.deliveryOrderAvailable,
        title,
        body,
        data,
      })),
    });

    await this.sendPush(agents.map((agent) => agent.id), title, body, { ...data as object, route: '/(delivery)' });

    // TODO: Expo Push / FCM using stored device tokens
    for (const agent of agents) {
      this.logger.log(
        `[STUB push] delivery_agent=${agent.email} phone=${agent.phone ?? 'n/a'} title="${title}" body="${body}"`,
      );
    }

    return agents.length;
  }

  async listForUser(userId: string, opts?: { unreadOnly?: boolean; limit?: number }) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(opts?.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markOrderNotificationsRead(userId: string, orderId: string) {
    const unread = await this.prisma.notification.findMany({
      where: {
        userId,
        type: NOTIFICATION_TYPES.deliveryOrderAvailable,
        readAt: null,
      },
    });

    const ids = unread
      .filter((n) => {
        const data = n.data as { orderId?: string } | null;
        return data?.orderId === orderId;
      })
      .map((n) => n.id);

    if (ids.length === 0) return;
    await this.prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { readAt: new Date() },
    });
  }
}
