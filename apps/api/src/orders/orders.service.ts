import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  HttpException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { decimalToNumber, generateOrderNumber, assertCompanyCanShop } from "../common/utils";
import {
  assertAdminStatusTransition,
  assertAssignFromStatus,
  assertRejectFromStatus,
  assertNotTerminal,
  assertUnassignFromStatus,
  isReassignment,
} from "../common/utils/order-status";
import { CreateOrderDto } from "./dto/order.dto";
import { AddressesService } from "../addresses/addresses.service";
import {
  DEFAULT_TAX_RATE,
  calculateDeliveryFee,
  STORE_ORIGIN,
} from "@doublea/shared";
import { NotificationsService } from "../notifications/notifications.service";
import { WhishService } from "../whish/whish.service";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { createInvoicePdf } from "./invoice-pdf";

const ORDER_DETAIL_INCLUDE = {
  items: true,
  address: true,
  statusHistory: { orderBy: { createdAt: "desc" as const } },
  deliveryProof: true,
  deliveryAgent: { select: { id: true, fullName: true, phone: true } },
  user: { select: { id: true, fullName: true, email: true, phone: true } },
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private addressesService: AddressesService,
    private notifications: NotificationsService,
    @Inject(forwardRef(() => WhishService))
    private whishService: WhishService,
  ) {}

  private formatOrder(
    order: Record<string, unknown>,
    options?: { includeCoordinates?: boolean },
  ) {
    const address = order.address
      ? this.addressesService.toPublic(order.address as never, {
          includeCoordinates: options?.includeCoordinates === true,
        })
      : undefined;

    return {
      ...order,
      address,
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

  private async fetchOrderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) throw new NotFoundException("Order not found");
    return this.formatOrder(order as unknown as Record<string, unknown>, {
      includeCoordinates: true,
    });
  }

  private resolveStoreOrigin() {
    const lat = process.env.STORE_LAT
      ? parseFloat(process.env.STORE_LAT)
      : STORE_ORIGIN.lat;
    const lng = process.env.STORE_LNG
      ? parseFloat(process.env.STORE_LNG)
      : STORE_ORIGIN.lng;
    return {
      originLat: Number.isFinite(lat) ? lat : STORE_ORIGIN.lat,
      originLng: Number.isFinite(lng) ? lng : STORE_ORIGIN.lng,
    };
  }

  private quoteDeliveryForAddress(address: {
    latitude?: number | null;
    longitude?: number | null;
    city?: string | null;
  }) {
    return calculateDeliveryFee({
      latitude: address.latitude,
      longitude: address.longitude,
      city: address.city,
      ...this.resolveStoreOrigin(),
    });
  }

  async getDeliveryQuote(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId, deletedAt: null },
    });
    if (!address) throw new NotFoundException("Address not found");
    return this.quoteDeliveryForAddress(address);
  }

  private checkoutHash(dto: CreateOrderDto): string {
    const normalized = {
      addressId: dto.addressId,
      paymentMethod: dto.paymentMethod || "cash_on_delivery",
      customerNote: dto.customerNote?.trim() || null,
      couponCode: dto.couponCode?.trim().toUpperCase() || null,
      items: [...dto.items]
        .map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedPriceType: item.selectedPriceType || "normal",
        }))
        .sort((a, b) => `${a.productId}:${a.selectedPriceType}`.localeCompare(`${b.productId}:${b.selectedPriceType}`)),
    };
    return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  }

  private async findIdempotentOrder(userId: string, idempotencyKey: string) {
    return this.prisma.order.findFirst({
      where: { userId, idempotencyKey },
      include: {
        items: true,
        address: true,
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });
  }

  async create(userId: string, userRole: string, dto: CreateOrderDto, idempotencyKey: string) {
    const idempotencyHash = this.checkoutHash(dto);
    const existingOrder = await this.findIdempotentOrder(userId, idempotencyKey);
    if (existingOrder) {
      if (existingOrder.idempotencyHash !== idempotencyHash) {
        throw new ConflictException("This idempotency key was already used for a different checkout");
      }
      return this.formatOrder(existingOrder as unknown as Record<string, unknown>);
    }

    const uniqueItems = new Set(dto.items.map((item) => `${item.productId}:${item.selectedPriceType || "normal"}`));
    if (uniqueItems.size !== dto.items.length) {
      throw new BadRequestException("Duplicate products must be combined into one order item");
    }
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId, deletedAt: null },
    });
    if (!address) throw new NotFoundException("Address not found");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companyProfile: true },
    });
    assertCompanyCanShop(user);

    let subtotal = 0;
    const orderItems: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      selectedPriceType: "normal" | "company";
      totalPrice: number;
    }[] = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product || !product.isActive) {
        throw new BadRequestException(
          `Product ${item.productId} not available`,
        );
      }
      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      let priceType = item.selectedPriceType || "normal";
      if (priceType === "company") {
        if (
          userRole !== "company" ||
          !user?.companyProfile ||
          user.companyProfile.status !== "approved"
        ) {
          throw new ForbiddenException("Company pricing not available");
        }
      }

      const unitPrice =
        priceType === "company"
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
      if (
        coupon &&
        coupon.isActive &&
        coupon.startsAt <= new Date() &&
        coupon.expiresAt >= new Date()
      ) {
        if (subtotal >= decimalToNumber(coupon.minOrderAmount)) {
          if (coupon.type === "percentage") {
            discountAmount = subtotal * (decimalToNumber(coupon.value) / 100);
          } else {
            discountAmount = decimalToNumber(coupon.value);
          }
        }
      }
    }

    const deliveryQuote = this.quoteDeliveryForAddress(address);
    const deliveryFee = deliveryQuote.deliveryFee;
    const taxable = subtotal - discountAmount;
    const taxAmount = taxable * DEFAULT_TAX_RATE;
    const totalAmount = taxable + deliveryFee + taxAmount;
    const paymentMethod = dto.paymentMethod || "cash_on_delivery";
    const isWish = paymentMethod === "wish_money";
    const whishExternalId = isWish
      ? String(this.whishService.generateExternalId())
      : null;

    let order: Awaited<ReturnType<typeof this.findIdempotentOrder>> = null;
    let createdNewOrder = false;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        order = await this.prisma.$transaction(async (tx) => {
          for (const item of orderItems) {
            const stockUpdate = await tx.product.updateMany({
              where: {
                id: item.productId,
                isActive: true,
                stockQuantity: { gte: item.quantity },
              },
              data: {
                stockQuantity: { decrement: item.quantity },
                soldCount: { increment: item.quantity },
              },
            });
            if (stockUpdate.count !== 1) {
              throw new BadRequestException(`Insufficient stock for ${item.productName}`);
            }
          }

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          addressId: dto.addressId,
          paymentMethod,
          paymentStatus: "unpaid",
          whishExternalId,
          subtotal,
          deliveryFee,
          discountAmount,
          taxAmount,
          totalAmount,
          customerNote: dto.customerNote,
          items: { create: orderItems },
          statusHistory: {
            create: {
              status: "pending",
              note: isWish ? "Order placed — awaiting Wish Money payment" : "Order placed",
              changedByUserId: userId,
          const created = await tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              userId,
              addressId: dto.addressId,
              idempotencyKey,
              idempotencyHash,
              paymentMethod: dto.paymentMethod || "cash_on_delivery",
              subtotal,
              deliveryFee,
              discountAmount,
              taxAmount,
              totalAmount,
              customerNote: dto.customerNote,
              items: { create: orderItems },
              statusHistory: {
                create: {
                  status: "pending",
                  note: "Order placed",
                  changedByUserId: userId,
                },
              },
            },
            include: {
              items: true,
              address: true,
              user: { select: { id: true, fullName: true, email: true, phone: true } },
            },
          });

      // Wish: keep cart until payment is confirmed so failed/cancelled pays don't lose the cart
      if (!isWish) {
        await tx.cartItem.deleteMany({
          where: {
            cart: { userId },
            productId: { in: orderItems.map((i) => i.productId) },
          },
        });
      }
          await tx.cartItem.deleteMany({
            where: {
              cart: { userId },
              productId: { in: orderItems.map((i) => i.productId) },
            },
          });

          return created;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        createdNewOrder = true;
        break;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const duplicate = await this.findIdempotentOrder(userId, idempotencyKey);
          if (duplicate) {
            if (duplicate.idempotencyHash !== idempotencyHash) {
              throw new ConflictException("This idempotency key was already used for a different checkout");
            }
            order = duplicate;
            break;
          }
          if (attempt < maxAttempts) continue;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < maxAttempts) {
          continue;
        }
        throw error;
      }
    }

    if (isWish && whishExternalId) {
      try {
        const payment = await this.whishService.createPayment({
          amount: decimalToNumber(order.totalAmount),
          orderNumber: order.orderNumber,
          externalId: Number(whishExternalId),
          orderId: order.id,
        });

        if (!payment.success || !payment.collectUrl) {
          await this.rollbackUnpaidWishOrder(order.id, orderItems);
          throw new BadRequestException(
            payment.dialog?.message ||
              "Could not start Wish Money payment. Please try again.",
          );
        }

        return {
          ...this.formatOrder(order as unknown as Record<string, unknown>),
          collectUrl: payment.collectUrl,
        };
      } catch (err) {
        if (err instanceof HttpException) throw err;
        await this.rollbackUnpaidWishOrder(order.id, orderItems);
        const message =
          err instanceof Error ? err.message : "Wish Money payment failed to start";
        throw new BadRequestException(message);
      }
    }

    try {
    if (!order) throw new ConflictException("Checkout could not be completed safely. Please retry.");

    if (createdNewOrder) {
      try {
      await this.notifications.notifyDeliveryAgentsNewOrder(order);
      } catch {
      /* order already created — notification failure must not fail checkout */
      }
    }

    return this.formatOrder(order as unknown as Record<string, unknown>);
  }

  private async rollbackUnpaidWishOrder(
    orderId: string,
    orderItems: { productId: string; quantity: number }[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
            soldCount: { decrement: item.quantity },
          },
        });
      }
      await tx.order.delete({ where: { id: orderId } });
    });
  }

  async confirmWhishPaymentByExternalId(externalId: string) {
    const order = await this.prisma.order.findFirst({
      where: { whishExternalId: externalId, paymentMethod: "wish_money" },
      include: { items: true },
    });
    if (!order) return null;
    if (order.paymentStatus === "paid") {
      return this.fetchOrderDetail(order.id);
    }

    const status = await this.whishService.getPaymentStatus(Number(externalId));
    if (status.collectStatus !== "success") {
      return this.fetchOrderDetail(order.id);
    }

    return this.markWishOrderPaid(order.id, order.userId, status.transactionId);
  }

  async verifyWhishPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentMethod !== "wish_money") {
      throw new BadRequestException("Order is not a Wish Money payment");
    }
    if (!order.whishExternalId) {
      throw new BadRequestException("Wish Money payment session missing");
    }
    if (order.paymentStatus === "paid") {
      return {
        ...((await this.fetchOrderDetail(orderId)) as Record<string, unknown>),
        collectStatus: "success" as const,
      };
    }

    const status = await this.whishService.getPaymentStatus(
      Number(order.whishExternalId),
    );

    if (status.collectStatus === "success") {
      const paid = await this.markWishOrderPaid(
        order.id,
        order.userId,
        status.transactionId,
      );
      return { ...paid, collectStatus: "success" as const };
    }

    return {
      ...((await this.fetchOrderDetail(orderId)) as Record<string, unknown>),
      collectStatus: status.collectStatus,
    };
  }

  private async markWishOrderPaid(
    orderId: string,
    userId: string,
    transactionId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentStatus === "paid") {
      return this.fetchOrderDetail(orderId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "paid",
          whishTransactionId: transactionId || order.whishTransactionId,
          statusHistory: {
            create: {
              status: order.status,
              note: "Wish Money payment confirmed",
              changedByUserId: userId,
            },
          },
        },
      });

      await tx.cartItem.deleteMany({
        where: {
          cart: { userId },
          productId: { in: order.items.map((i) => i.productId) },
        },
      });
    });

    try {
      await this.notifications.notifyDeliveryAgentsNewOrder(order);
    } catch {
      /* ignore */
    }

    return this.fetchOrderDetail(orderId);
  }

  async getMyOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        address: true,
        deliveryAgent: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return orders.map((o) =>
      this.formatOrder(o as unknown as Record<string, unknown>),
    );
  async getMyOrders(userId: string, page = 1, limit = 20) {
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: true,
          address: true,
          deliveryAgent: { select: { id: true, fullName: true, phone: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return {
      data: orders.map((o) => this.formatOrder(o as unknown as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrder(userId: string, userRole: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) throw new NotFoundException("Order not found");

    if (
      userRole !== "admin" &&
      userRole !== "delivery_agent" &&
      order.userId !== userId
    ) {
      throw new ForbiddenException("Access denied");
    }

    if (userRole === "delivery_agent" && order.deliveryAgentId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    return this.formatOrder(order as unknown as Record<string, unknown>, {
      includeCoordinates: true,
    });
  }

  async getInvoice(userId: string, userRole: string, orderId: string) {
    const order = await this.getOrder(userId, userRole, orderId);
    if (userRole === 'delivery_agent') {
      throw new ForbiddenException('Invoices are only available to the customer and administrators');
    }
    return createInvoicePdf(order);
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== "pending") {
      throw new BadRequestException("Only pending orders can be cancelled");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, userId, status: "pending" },
        data: { status: "cancelled" },
      });
      if (claimed.count !== 1) {
        throw new ConflictException("Order status changed before cancellation completed");
      }

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
            soldCount: { decrement: item.quantity },
          },
        });
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: "cancelled",
          note: "Cancelled by customer",
          changedByUserId: userId,
        },
      });
      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true, address: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await this.notifications.notifyOrderStatus(orderId, 'cancelled', { previousAgentId: order.deliveryAgentId });

    return this.formatOrder(updated as unknown as Record<string, unknown>);
  }

  async updateStatus(
    orderId: string,
    status: string,
    changedByUserId: string,
    note?: string,
    options?: { validateAdmin?: boolean },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Order not found");

    if (options?.validateAdmin) {
      assertAdminStatusTransition(order.status, status);
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as never,
        statusHistory: {
          create: { status: status as never, note, changedByUserId },
        },
      },
    });

    await this.notifications.notifyOrderStatus(orderId, status as never);

    return this.fetchOrderDetail(orderId);
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: "unpaid" | "paid" | "refunded",
    adminId: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");

    if (order.status === "cancelled") {
      throw new BadRequestException("Cannot update payment on a cancelled order");
    }

    if (order.paymentStatus === paymentStatus) {
      return this.fetchOrderDetail(orderId);
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
        statusHistory: {
          create: {
            status: order.status,
            note: `Payment marked ${paymentStatus}`,
            changedByUserId: adminId,
          },
        },
      },
    });

    return this.fetchOrderDetail(orderId);
  }

  async assignDeliveryAgent(
    orderId: string,
    deliveryAgentId: string,
    adminId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Order not found");

    assertNotTerminal(order.status, "assign a delivery agent");
    assertAssignFromStatus(order.status);

    const agent = await this.prisma.user.findFirst({
      where: { id: deliveryAgentId, role: "delivery_agent", isActive: true },
    });
    if (!agent) throw new NotFoundException("Delivery agent not found");

    const reassign = isReassignment(order.status);
    const note = reassign
      ? `Reassigned to ${agent.fullName}`
      : `Assigned to ${agent.fullName}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryAgentId,
          status: "assigned",
          statusHistory: {
            create: {
              status: "assigned",
              note,
              changedByUserId: adminId,
            },
          },
        },
      });
    });

    await this.notifications.notifyOrderStatus(orderId, 'assigned', { assignedAgentId: deliveryAgentId });

    return this.fetchOrderDetail(orderId);
  }

  async unassignDeliveryAgent(orderId: string, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Order not found");

    assertUnassignFromStatus(order.status);

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryAgentId: null,
          status: "confirmed",
          statusHistory: {
            create: {
              status: "confirmed",
              note: "Unassigned by admin — ready for reassignment",
              changedByUserId: adminId,
            },
          },
        },
      });
    });

    return this.fetchOrderDetail(orderId);
  }

  async rejectAssignment(orderId: string, agentId: string, reason?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deliveryAgentId: agentId },
    });
    if (!order) throw new ForbiddenException("Order not assigned to you");

    assertRejectFromStatus(order.status);

    const note = reason
      ? `Rejected by driver: ${reason}`
      : "Rejected by driver — ready for reassignment";

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryAgentId: null,
          status: "confirmed",
          statusHistory: {
            create: {
              status: "confirmed",
              note,
              changedByUserId: agentId,
            },
          },
        },
      });
    });

    return this.fetchOrderDetail(orderId);
  }

  async getAllOrders(query: {
    page?: number;
    limit?: number;
    status?: string;
    scope?: "active" | "archive";
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const terminalStatuses = ["delivered", "cancelled"] as const;
    const where: Prisma.OrderWhereInput = query.status
      ? { status: query.status as never }
      : query.scope === "archive"
        ? { status: { in: [...terminalStatuses] } }
        : query.scope === "active"
          ? { status: { notIn: [...terminalStatuses] } }
          : {};

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          address: true,
          user: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          deliveryAgent: { select: { id: true, fullName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((o) =>
        this.formatOrder(o as unknown as Record<string, unknown>),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
