import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { AddressesService } from "../addresses/addresses.service";
import { NotificationsService } from "../notifications/notifications.service";
import { decimalToNumber } from "../common/utils";
import {
  assertDriverAccept,
  assertDriverDelivered,
  assertDriverOnTheWay,
  assertDriverPickedUp,
} from "../common/utils/order-status";
import { DeliveryProofDto } from "./dto/delivery.dto";

const AVAILABLE_STATUSES = ["pending", "confirmed"] as const;

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private addressesService: AddressesService,
    private notifications: NotificationsService,
  ) {}

  async getAssignedOrders(agentId: string, status?: string) {
    const where: Record<string, unknown> = { deliveryAgentId: agentId };
    if (status) where.status = status;

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: true,
        address: true,
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const grouped = {
      assigned: [] as unknown[],
      accepted: [] as unknown[],
      picked_up: [] as unknown[],
      on_the_way: [] as unknown[],
      delivered: [] as unknown[],
    };

    for (const order of orders) {
      const formatted = {
        ...order,
        address: order.address
          ? this.addressesService.toPublic(order.address)
          : null,
        subtotal: decimalToNumber(order.subtotal),
        totalAmount: decimalToNumber(order.totalAmount),
        itemCount: order.items.length,
      };
      const key = order.status as keyof typeof grouped;
      if (grouped[key]) grouped[key].push(formatted);
    }

    return grouped;
  }

  /** Unassigned orders drivers can lock (claim). */
  async getAvailableOrders() {
    const orders = await this.prisma.order.findMany({
      where: {
        deliveryAgentId: null,
        status: { in: [...AVAILABLE_STATUSES] },
      },
      include: {
        items: true,
        address: true,
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return orders.map((order) => ({
      ...order,
      subtotal: decimalToNumber(order.subtotal),
      deliveryFee: decimalToNumber(order.deliveryFee),
      totalAmount: decimalToNumber(order.totalAmount),
      itemCount: order.items.length,
    }));
  }

  /**
   * Atomically lock (claim) an available order for this delivery agent.
   * Sets agent + accepted so the driver owns it immediately.
   */
  async lockOrder(agentId: string, orderId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          deliveryAgentId: null,
          status: { in: [...AVAILABLE_STATUSES] },
        },
        data: {
          deliveryAgentId: agentId,
          status: "accepted",
        },
      });

      if (updated.count === 0) {
        const existing = await tx.order.findUnique({ where: { id: orderId } });
        if (!existing) throw new NotFoundException("Order not found");
        throw new ConflictException(
          "Order was already locked by another driver",
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: "accepted",
          note: "Locked by delivery agent",
          changedByUserId: agentId,
        },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          address: true,
          user: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
        },
      });
    });

    await this.notifications.markOrderNotificationsRead(agentId, orderId);

    return {
      ...result,
      subtotal: decimalToNumber(result!.subtotal),
      deliveryFee: decimalToNumber(result!.deliveryFee),
      totalAmount: decimalToNumber(result!.totalAmount),
      itemCount: result!.items.length,
    };
  }

  async getNotifications(agentId: string, unreadOnly?: boolean) {
    const rows = await this.notifications.listForUser(agentId, {
      unreadOnly,
      limit: 40,
    });
    return rows.map((n) => ({
      ...n,
      data: n.data as Record<string, unknown> | null,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    }));
  }

  async markNotificationRead(agentId: string, notificationId: string) {
    const result = await this.notifications.markRead(agentId, notificationId);
    if (result.count === 0)
      throw new NotFoundException("Notification not found");
    return { success: true };
  }

  async getOrder(agentId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deliveryAgentId: agentId },
    });
    if (!order) throw new NotFoundException("Order not found");
    return this.ordersService.getOrder(agentId, "delivery_agent", orderId);
  }

  private async validateAgentOrder(agentId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deliveryAgentId: agentId },
    });
    if (!order) throw new ForbiddenException("Order not assigned to you");
    return order;
  }

  async acceptOrder(agentId: string, orderId: string) {
    const order = await this.validateAgentOrder(agentId, orderId);
    assertDriverAccept(order.status);
    return this.ordersService.updateStatus(
      orderId,
      "accepted",
      agentId,
      "Accepted by driver",
    );
  }

  async rejectOrder(agentId: string, orderId: string, reason?: string) {
    await this.ordersService.rejectAssignment(orderId, agentId, reason);
    return {
      success: true,
      message: "Order rejected and returned for reassignment",
      orderId,
    };
  }

  async markPickedUp(agentId: string, orderId: string) {
    const order = await this.validateAgentOrder(agentId, orderId);
    assertDriverPickedUp(order.status);
    return this.ordersService.updateStatus(
      orderId,
      "picked_up",
      agentId,
      "Picked up by agent",
    );
  }

  async markOnTheWay(agentId: string, orderId: string) {
    const order = await this.validateAgentOrder(agentId, orderId);
    assertDriverOnTheWay(order.status);
    return this.ordersService.updateStatus(
      orderId,
      "on_the_way",
      agentId,
      "On the way",
    );
  }

  async markDelivered(agentId: string, orderId: string, dto: DeliveryProofDto) {
    const order = await this.validateAgentOrder(agentId, orderId);
    assertDriverDelivered(order.status);

    if (
      !dto.agentSignatureDataUrl?.trim() ||
      !dto.clientSignatureDataUrl?.trim()
    ) {
      throw new BadRequestException(
        "Both driver and client signatures are required",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryProof.create({
        data: {
          orderId,
          deliveryAgentId: agentId,
          deliveredToName: dto.deliveredToName,
          deliveryNote: dto.deliveryNote,
          agentSignatureDataUrl: dto.agentSignatureDataUrl,
          clientSignatureDataUrl: dto.clientSignatureDataUrl,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "delivered",
          paymentStatus:
            order.paymentMethod === "cash_on_delivery"
              ? "paid"
              : order.paymentStatus,
          statusHistory: {
            create: {
              status: "delivered",
              note:
                dto.deliveryNote || "Delivered successfully with signatures",
              changedByUserId: agentId,
            },
          },
        },
      });
    });

    return this.getOrder(agentId, orderId);
  }
}
