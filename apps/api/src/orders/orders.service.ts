import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
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
import { CreateGuestOrderDto, CreateOrderDto, GuestDeliveryQuoteDto } from "./dto/order.dto";
import { AddressesService } from "../addresses/addresses.service";
import {
  DEFAULT_TAX_RATE,
  calculateDeliveryFee,
  STORE_ORIGIN,
} from "@doublea/shared";
import { NotificationsService } from "../notifications/notifications.service";
import { WhatsappService } from "../notifications/whatsapp.service";
import { Prisma } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { createInvoicePdf } from "./invoice-pdf";

const ORDER_DETAIL_INCLUDE = {
  items: { orderBy: [{ position: "asc" as const }, { id: "asc" as const }] },
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
    private whatsapp: WhatsappService,
  ) {}

  private guestTokenHash(token?: string) {
    const clean = token?.trim();
    if (!clean || clean.length < 32 || clean.length > 256) {
      throw new UnauthorizedException("A valid guest device token is required");
    }
    return createHash("sha256").update(clean).digest("hex");
  }

  private async requireGuestUser(token?: string) {
    const guestAccessTokenHash = this.guestTokenHash(token);
    const user = await this.prisma.user.findFirst({
      where: { guestAccessTokenHash, authProvider: "guest", isActive: true },
    });
    if (!user) throw new UnauthorizedException("Guest orders were not found on this device");
    return user;
  }

  private async notifyGuest(orderId: string, kind: Parameters<WhatsappService["notifyGuestOrder"]>[1], invoiceToken?: string) {
    try {
      await this.whatsapp.notifyGuestOrder(orderId, kind, invoiceToken);
    } catch {
      // Messaging is optional and must never block checkout or order management.
    }
  }

  private formatOrder(
    order: Record<string, unknown>,
    options?: { includeCoordinates?: boolean },
  ) {
    const address = order.address
      ? this.addressesService.toPublic(order.address as never, {
          includeCoordinates: options?.includeCoordinates === true,
        })
      : undefined;

    const user = order.user
      ? {
          ...(order.user as { id?: string; fullName?: string; email?: string; phone?: string | null }),
          ...(order.isGuest ? { email: (order.guestEmail as string | null) || '' } : {}),
        }
      : undefined;

    return {
      ...order,
      user,
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

  getGuestDeliveryQuote(dto: GuestDeliveryQuoteDto) {
    return this.quoteDeliveryForAddress(dto);
  }

  async createGuest(dto: CreateGuestOrderDto, guestToken: string | undefined, idempotencyKey: string) {
    const guestAccessTokenHash = this.guestTokenHash(guestToken);
    const normalizedItems = dto.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedPriceType: "normal" as const,
    }));

    let user = await this.prisma.user.findUnique({ where: { guestAccessTokenHash } });
    if (!user) {
      try {
        user = await this.prisma.user.create({
          data: {
            email: `guest-${guestAccessTokenHash.slice(0, 48)}@guest.nicepricebazar.invalid`,
            fullName: dto.address.fullName.trim(),
            phone: dto.address.phone.trim(),
            role: "normal_user",
            authProvider: "guest",
            guestAccessTokenHash,
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
        user = await this.prisma.user.findUnique({ where: { guestAccessTokenHash } });
      }
    }
    if (!user || user.authProvider !== "guest") throw new ConflictException("Guest identity could not be created");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { fullName: dto.address.fullName.trim(), phone: dto.address.phone.trim() },
    });

    const existing = await this.findIdempotentOrder(user.id, idempotencyKey);
    if (existing) return this.formatOrder(existing as unknown as Record<string, unknown>);

    const address = await this.addressesService.create(user.id, {
      label: "Guest delivery",
      fullName: dto.address.fullName.trim(),
      phone: dto.address.phone.trim(),
      country: "Lebanon",
      district: dto.address.district.trim(),
      city: dto.address.city.trim(),
      settlementId: dto.address.settlementId,
      street: dto.address.street.trim(),
      building: dto.address.building?.trim(),
      floor: dto.address.floor?.trim(),
      apartment: dto.address.apartment?.trim(),
      latitude: dto.address.latitude,
      longitude: dto.address.longitude,
      locationAccuracyM: dto.address.locationAccuracyM,
      isDefault: false,
    });

    const invoiceToken = randomBytes(32).toString("hex");
    const created = await this.create(user.id, "normal_user", {
      addressId: address.id,
      paymentMethod: dto.paymentMethod,
      customerNote: dto.customerNote,
      items: normalizedItems,
    }, idempotencyKey);
    const orderId = (created as unknown as { id: string }).id;
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        isGuest: true,
        guestEmail: dto.email?.trim() || null,
        guestWhatsappOptIn: dto.whatsappOptIn === true,
        guestInvoiceTokenHash: createHash("sha256").update(invoiceToken).digest("hex"),
      },
    });
    await this.notifyGuest(orderId, "order_received", invoiceToken);
    return this.fetchOrderDetail(orderId);
  }

  async getGuestOrders(token: string | undefined, page = 1, limit = 20) {
    const guestAccessTokenHash = this.guestTokenHash(token);
    const user = await this.prisma.user.findFirst({
      where: { guestAccessTokenHash, authProvider: "guest", isActive: true },
    });
    if (!user) return { data: [], total: 0, page, limit, totalPages: 0 };
    return this.getMyOrders(user.id, page, limit);
  }

  async getGuestOrder(token: string | undefined, orderId: string) {
    const user = await this.requireGuestUser(token);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: user.id, isGuest: true },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) throw new NotFoundException("Order not found");
    return this.formatOrder(order as unknown as Record<string, unknown>, { includeCoordinates: true });
  }

  async getGuestInvoice(token: string | undefined, orderId: string) {
    return createInvoicePdf(await this.getGuestOrder(token, orderId));
  }

  async getGuestInvoiceByToken(invoiceToken: string) {
    if (!invoiceToken || invoiceToken.length < 32 || invoiceToken.length > 256) {
      throw new NotFoundException("Invoice not found");
    }
    const guestInvoiceTokenHash = createHash("sha256").update(invoiceToken).digest("hex");
    const order = await this.prisma.order.findFirst({
      where: { guestInvoiceTokenHash, isGuest: true },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) throw new NotFoundException("Invoice not found");
    return createInvoicePdf(this.formatOrder(order as unknown as Record<string, unknown>, { includeCoordinates: false }));
  }

  async cancelGuestOrder(token: string | undefined, orderId: string) {
    const user = await this.requireGuestUser(token);
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId: user.id, isGuest: true } });
    if (!order) throw new NotFoundException("Order not found");
    return this.cancelOrder(user.id, orderId);
  }

  async recordItemPreparation(
    orderId: string,
    itemId: string,
    decision: "prepared" | "unavailable",
    adminId: string,
  ) {
    let cancelled = false;
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { orderBy: [{ position: "asc" }, { id: "asc" }] } },
      });
      if (!order) throw new NotFoundException("Order not found");
      if (order.status !== "pending") {
        throw new BadRequestException("Item preparation can only be changed while the order is pending");
      }

      const itemIndex = order.items.findIndex((item) => item.id === itemId);
      if (itemIndex < 0) throw new NotFoundException("Order item not found");
      const blockedByEarlierItem = order.items.slice(0, itemIndex).some(
        (item) => item.preparedQuantity + item.unavailableQuantity < item.quantity,
      );
      if (blockedByEarlierItem) {
        throw new BadRequestException("Finish the previous item before preparing this one");
      }

      const item = order.items[itemIndex];
      if (item.preparedQuantity + item.unavailableQuantity >= item.quantity) {
        throw new BadRequestException("Every unit of this item already has a preparation decision");
      }

      const updatedItem = await tx.orderItem.update({
        where: { id: item.id },
        data: decision === "prepared"
          ? { preparedQuantity: { increment: 1 } }
          : {
              unavailableQuantity: { increment: 1 },
              totalPrice: { decrement: item.unitPrice },
            },
      });

      if (decision === "unavailable") {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: 1 }, soldCount: { decrement: 1 } },
        });
      }

      const resultingItems = order.items.map((entry) => entry.id === item.id ? updatedItem : entry);
      const subtotal = resultingItems.reduce((sum, entry) => sum + decimalToNumber(entry.totalPrice), 0);
      const allDecided = resultingItems.every(
        (entry) => entry.preparedQuantity + entry.unavailableQuantity === entry.quantity,
      );
      const allUnavailable = allDecided && resultingItems.every((entry) => entry.unavailableQuantity === entry.quantity);
      const discountAmount = Math.min(decimalToNumber(order.discountAmount), subtotal);
      const deliveryFee = allUnavailable ? 0 : decimalToNumber(order.deliveryFee);
      const taxAmount = Math.max(0, subtotal - discountAmount) * DEFAULT_TAX_RATE;
      const totalAmount = subtotal - discountAmount + deliveryFee + taxAmount;

      await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal,
          deliveryFee,
          discountAmount,
          taxAmount,
          totalAmount,
          ...(allUnavailable ? { status: "cancelled" } : {}),
          statusHistory: {
            create: {
              status: allUnavailable ? "cancelled" : "pending",
              note: allUnavailable
                ? "Order cancelled automatically — every item was unavailable"
                : `${item.productName}: 1 unit marked ${decision}`,
              changedByUserId: adminId,
            },
          },
        },
      });
      cancelled = allUnavailable;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (cancelled) {
      await this.notifications.notifyOrderStatus(orderId, "cancelled");
      await this.notifyGuest(orderId, "order_cancelled");
    }
    return this.fetchOrderDetail(orderId);
  }

  async prepareAllItems(orderId: string, adminId: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new NotFoundException("Order not found");
      if (order.status !== "pending") {
        throw new BadRequestException("Items can only be prepared while the order is pending");
      }
      for (const item of order.items) {
        const remaining = item.quantity - item.preparedQuantity - item.unavailableQuantity;
        if (remaining > 0) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: { preparedQuantity: { increment: remaining } },
          });
        }
      }
      await tx.orderStatusHistory.create({
        data: { orderId, status: "pending", note: "All remaining items marked prepared", changedByUserId: adminId },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.fetchOrderDetail(orderId);
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
    let orderItems: {
      productId: string;
      productName: string;
      position: number;
      quantity: number;
      unitPrice: number;
      selectedPriceType: "normal" | "company";
      paymentMethod: "cash_on_delivery" | "wish_money";
      totalPrice: number;
    }[] = [];

    const paymentMethod =
      dto.paymentMethod === "wish_money" ? "wish_money" : "cash_on_delivery";
    const isWish = paymentMethod === "wish_money";

    for (const [position, item] of dto.items.entries()) {
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
        if (product.companyPrice === null) {
          throw new BadRequestException(`Wholesale pricing is not available for ${product.name}`);
        }
      }

      const unitPrice =
        priceType === "company"
          ? decimalToNumber(product.companyPrice!)
          : decimalToNumber(product.normalPrice);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        position,
        quantity: item.quantity,
        unitPrice,
        selectedPriceType: priceType,
        paymentMethod,
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

    let order: Awaited<ReturnType<typeof this.findIdempotentOrder>> = null;
    let createdNewOrder = false;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        order = await this.prisma.$transaction(
          async (tx) => {
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
                throw new BadRequestException(
                  `Insufficient stock for ${item.productName}`,
                );
              }
            }

            const created = await tx.order.create({
              data: {
                orderNumber: generateOrderNumber(),
                userId,
                addressId: dto.addressId,
                idempotencyKey,
                idempotencyHash,
                paymentMethod,
                paymentStatus: "unpaid",
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
                    note: isWish
                      ? "Order placed — awaiting Wish Money confirmation"
                      : "Order placed",
                    changedByUserId: userId,
                  },
                },
              },
              include: {
                items: true,
                address: true,
                user: {
                  select: { id: true, fullName: true, email: true, phone: true },
                },
              },
            });

            await tx.cartItem.deleteMany({
              where: {
                cart: { userId },
                productId: { in: orderItems.map((i) => i.productId) },
              },
            });

            return created;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        createdNewOrder = true;
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const duplicate = await this.findIdempotentOrder(
            userId,
            idempotencyKey,
          );
          if (duplicate) {
            if (duplicate.idempotencyHash !== idempotencyHash) {
              throw new ConflictException(
                "This idempotency key was already used for a different checkout",
              );
            }
            order = duplicate;
            break;
          }
          if (attempt < maxAttempts) continue;
        }
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < maxAttempts
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!order) {
      throw new ConflictException(
        "Checkout could not be completed safely. Please retry.",
      );
    }

    if (createdNewOrder) {
      try {
        await this.notifications.notifyDeliveryAgentsNewOrder(order);
      } catch {
        /* order already created — notification failure must not fail checkout */
      }
    }

    return this.formatOrder(order as unknown as Record<string, unknown>);
  }

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
        const restockQuantity = item.quantity - item.unavailableQuantity;
        if (restockQuantity <= 0) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: restockQuantity },
            soldCount: { decrement: restockQuantity },
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
    await this.notifyGuest(orderId, "order_cancelled");

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

    if (order.status === "pending" && status === "confirmed") {
      const items = await this.prisma.orderItem.findMany({ where: { orderId } });
      const incomplete = items.some(
        (item) => item.preparedQuantity + item.unavailableQuantity !== item.quantity,
      );
      if (incomplete) {
        throw new BadRequestException("Decide whether every ordered unit is prepared or unavailable before finishing preparation");
      }
      if (items.every((item) => item.unavailableQuantity === item.quantity)) {
        throw new BadRequestException("An order with no prepared items cannot continue to delivery");
      }
    }

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

    const whatsappKind = {
      confirmed: "order_confirmed",
      on_the_way: "order_on_the_way",
      delivered: "order_delivered",
      cancelled: "order_cancelled",
    }[status] as Parameters<WhatsappService["notifyGuestOrder"]>[1] | undefined;
    if (whatsappKind) await this.notifyGuest(orderId, whatsappKind);

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

    if (order.paymentMethod === "wish_money" && paymentStatus === "paid") {
      await this.notifyGuest(orderId, "wish_payment_confirmed");
    }

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
    paymentMethod?: string;
    paymentStatus?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const terminalStatuses = ["delivered", "cancelled"] as const;
    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status as never;
    } else if (query.scope === "archive") {
      where.status = { in: [...terminalStatuses] };
    } else if (query.scope === "active") {
      where.status = { notIn: [...terminalStatuses] };
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod as never;
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus as never;
    }

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
