import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { decimalToNumber } from '../common/utils';
import { DeliveryProofDto } from './dto/delivery.dto';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  async getAssignedOrders(agentId: string, status?: string) {
    const where: Record<string, unknown> = { deliveryAgentId: agentId };
    if (status) where.status = status;

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: true,
        address: true,
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const grouped = {
      assigned: [] as unknown[],
      picked_up: [] as unknown[],
      on_the_way: [] as unknown[],
      delivered: [] as unknown[],
    };

    for (const order of orders) {
      const formatted = {
        ...order,
        subtotal: decimalToNumber(order.subtotal),
        totalAmount: decimalToNumber(order.totalAmount),
        itemCount: order.items.length,
      };
      const key = order.status as keyof typeof grouped;
      if (grouped[key]) grouped[key].push(formatted);
    }

    return grouped;
  }

  async getOrder(agentId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deliveryAgentId: agentId },
      include: {
        items: true,
        address: true,
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.ordersService.getOrder(agentId, 'delivery_agent', orderId);
  }

  private async validateAgentOrder(agentId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deliveryAgentId: agentId },
    });
    if (!order) throw new ForbiddenException('Order not assigned to you');
    return order;
  }

  async markPickedUp(agentId: string, orderId: string) {
    const order = await this.validateAgentOrder(agentId, orderId);
    if (!['assigned', 'confirmed'].includes(order.status)) {
      throw new BadRequestException('Invalid status transition');
    }
    return this.ordersService.updateStatus(orderId, 'picked_up', agentId, 'Picked up by agent');
  }

  async markOnTheWay(agentId: string, orderId: string) {
    const order = await this.validateAgentOrder(agentId, orderId);
    if (order.status !== 'picked_up') {
      throw new BadRequestException('Order must be picked up first');
    }
    return this.ordersService.updateStatus(orderId, 'on_the_way', agentId, 'On the way');
  }

  async markDelivered(agentId: string, orderId: string, dto: DeliveryProofDto) {
    const order = await this.validateAgentOrder(agentId, orderId);
    if (!['picked_up', 'on_the_way'].includes(order.status)) {
      throw new BadRequestException('Invalid status for delivery');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryProof.create({
        data: {
          orderId,
          deliveryAgentId: agentId,
          deliveredToName: dto.deliveredToName,
          deliveryNote: dto.deliveryNote,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'delivered',
          paymentStatus: order.paymentMethod === 'cash_on_delivery' ? 'paid' : order.paymentStatus,
          statusHistory: {
            create: {
              status: 'delivered',
              note: dto.deliveryNote || 'Delivered successfully',
              changedByUserId: agentId,
            },
          },
        },
      });
    });

    return this.getOrder(agentId, orderId);
  }
}
