import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber, generateOrderNumber } from '../common/utils';
import { CreateOrderDto } from './dto/order.dto';

const DEFAULT_DELIVERY_FEE = 5.99;
const DEFAULT_TAX_RATE = 0.08;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private formatOrder(order: Record<string, unknown>) {
    return {
      ...order,
      subtotal: decimalToNumber(order.subtotal as never),
      deliveryFee: decimalToNumber(order.deliveryFee as never),
      discountAmount: decimalToNumber(order.discountAmount as never),
      taxAmount: decimalToNumber(order.taxAmount as never),
      totalAmount: decimalToNumber(order.totalAmount as never),
      items: (order.items as Record<string, unknown>[])?.map((item) => ({
        ...item,
        unitPrice: decimalToNumber(item.unitPrice as never),
        totalPrice: decimalToNumber(item.totalPrice as never),
      })),
    };
  }

  async create(userId: string, userRole: string, dto: CreateOrderDto) {
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companyProfile: true },
    });

    let subtotal = 0;
    const orderItems: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      selectedPriceType: 'normal' | 'company';
      totalPrice: number;
    }[] = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.isActive) {
        throw new BadRequestException(`Product ${item.productId} not available`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      let priceType = item.selectedPriceType || 'normal';
      if (priceType === 'company') {
        if (
          userRole !== 'company' ||
          !user?.companyProfile ||
          user.companyProfile.status !== 'approved'
        ) {
          throw new ForbiddenException('Company pricing not available');
        }
      }

      const unitPrice =
        priceType === 'company'
          ? decimalToNumber(product.companyPrice)
          : decimalToNumber(product.normalPrice);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        selectedPriceType: priceType,
        totalPrice,
      });
    }

    let discountAmount = 0;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode.toUpperCase() },
      });
      if (coupon && coupon.isActive && coupon.startsAt <= new Date() && coupon.expiresAt >= new Date()) {
        if (subtotal >= decimalToNumber(coupon.minOrderAmount)) {
          if (coupon.type === 'percentage') {
            discountAmount = subtotal * (decimalToNumber(coupon.value) / 100);
          } else {
            discountAmount = decimalToNumber(coupon.value);
          }
        }
      }
    }

    const deliveryFee = DEFAULT_DELIVERY_FEE;
    const taxable = subtotal - discountAmount;
    const taxAmount = taxable * DEFAULT_TAX_RATE;
    const totalAmount = taxable + deliveryFee + taxAmount;

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          addressId: dto.addressId,
          paymentMethod: dto.paymentMethod || 'cash_on_delivery',
          subtotal,
          deliveryFee,
          discountAmount,
          taxAmount,
          totalAmount,
          customerNote: dto.customerNote,
          items: { create: orderItems },
          statusHistory: {
            create: { status: 'pending', note: 'Order placed', changedByUserId: userId },
          },
        },
        include: {
          items: true,
          address: true,
          user: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      });

      await tx.cartItem.deleteMany({
        where: {
          cart: { userId },
          productId: { in: orderItems.map((i) => i.productId) },
        },
      });

      return created;
    });

    return this.formatOrder(order as unknown as Record<string, unknown>);
  }

  async getMyOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true, address: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.formatOrder(o as unknown as Record<string, unknown>));
  }

  async getOrder(userId: string, userRole: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        deliveryProof: true,
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (
      userRole !== 'admin' &&
      userRole !== 'delivery_agent' &&
      order.userId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (userRole === 'delivery_agent' && order.deliveryAgentId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.formatOrder(order as unknown as Record<string, unknown>);
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
      return tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          statusHistory: {
            create: { status: 'cancelled', note: 'Cancelled by customer', changedByUserId: userId },
          },
        },
        include: { items: true, address: true },
      });
    });

    return this.formatOrder(updated as unknown as Record<string, unknown>);
  }

  async updateStatus(
    orderId: string,
    status: string,
    changedByUserId: string,
    note?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as never,
        statusHistory: {
          create: { status: status as never, note, changedByUserId },
        },
      },
      include: { items: true, address: true, user: true },
    });
    return this.formatOrder(updated as unknown as Record<string, unknown>);
  }

  async assignDeliveryAgent(orderId: string, deliveryAgentId: string, adminId: string) {
    const agent = await this.prisma.user.findFirst({
      where: { id: deliveryAgentId, role: 'delivery_agent', isActive: true },
    });
    if (!agent) throw new NotFoundException('Delivery agent not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryAgentId,
          status: 'assigned',
          statusHistory: {
            create: {
              status: 'assigned',
              note: `Assigned to ${agent.fullName}`,
              changedByUserId: adminId,
            },
          },
        },
      });
      return this.getOrder(adminId, 'admin', orderId);
    });
  }

  async getAllOrders(query: { page?: number; limit?: number; status?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = query.status ? { status: query.status as never } : {};

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          address: true,
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          deliveryAgent: { select: { id: true, fullName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((o) => this.formatOrder(o as unknown as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
