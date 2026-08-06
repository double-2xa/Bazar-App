import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
} as const;

/**
 * In-app + outbound notification hooks.
 * Push/email/WhatsApp providers are stubbed for later wiring.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

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
      where: { role: 'delivery_agent', isActive: true },
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
