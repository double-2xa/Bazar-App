import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { AddressesService } from "../addresses/addresses.service";
import { LocationsService } from "../locations/locations.service";
import { NotificationsService } from "../notifications/notifications.service";
import { sanitizeUser } from "../common/utils";
import { CreateDeliveryAgentDto } from "./dto/admin.dto";
import { decimalToNumber } from "../common/utils";
import {
  getBeirutStartOfDay,
  getBeirutDaysAgoStart,
  getBeirutDateKey,
  emptyStatusBreakdown,
  LOW_STOCK_THRESHOLD,
} from "./dashboard.helpers";

const ACTIVE_MAP_STATUSES = [
  "pending",
  "confirmed",
  "assigned",
  "accepted",
  "picked_up",
  "on_the_way",
] as const;

const IN_DELIVERY_STATUSES = [
  "assigned",
  "accepted",
  "picked_up",
  "on_the_way",
] as const;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private addressesService: AddressesService,
    private locationsService: LocationsService,
    private notifications: NotificationsService,
  ) {}

  async getDashboardStats() {
    const startOfToday = getBeirutStartOfDay();
    const start7d = getBeirutDaysAgoStart(6);
    const start30d = getBeirutDaysAgoStart(29);

    const unassignedWhere: Prisma.OrderWhereInput = {
      status: "confirmed",
      deliveryAgentId: null,
    };

    const deliveredTodayWhere: Prisma.OrderWhereInput = {
      status: "delivered",
      OR: [
        { deliveryProof: { deliveredAt: { gte: startOfToday } } },
        { deliveryProof: null, updatedAt: { gte: startOfToday } },
      ],
    };

    const activeMapWhere: Prisma.OrderWhereInput = {
      status: { in: [...ACTIVE_MAP_STATUSES] },
    };

    const [
      totalOrders,
      totalRevenueAgg,
      totalUsers,
      totalProducts,
      totalCompanies,
      totalDrivers,
      todayOrders,
      todayRevenueAgg,
      deliveredTodayCount,
      pendingOrdersCount,
      confirmedOrdersCount,
      unassignedOrdersCount,
      inDeliveryOrdersCount,
      codUnpaidAgg,
      codUnpaidOrdersCount,
      pendingCompanyApprovalsCount,
      activeDeliveryAgentsCount,
      lowStockProductsCount,
      soldOutProductsCount,
      inStockProductsCount,
      completedOrders,
      statusGroups,
      ordersReadyForDriverCount,
      assignedCount,
      acceptedCount,
      pickedUpCount,
      onTheWayCount,
      mapOrdersRaw,
      activeOrdersForMapCount,
      recentOrdersRaw,
      topProductGroups,
      busyAgentsRaw,
      lowStockProductsRaw,
      pendingCompaniesRaw,
      ordersForTrend7,
      ordersForTrend30,
      ordersByCityRaw,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: { status: "delivered" },
        _sum: { totalAmount: true },
      }),
      this.prisma.user.count({
        where: { role: { in: ["normal_user", "company"] } },
      }),
      this.prisma.product.count(),
      this.prisma.companyProfile.count(),
      this.prisma.user.count({ where: { role: "delivery_agent" } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.aggregate({
        where: deliveredTodayWhere,
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({ where: deliveredTodayWhere }),
      this.prisma.order.count({ where: { status: "pending" } }),
      this.prisma.order.count({ where: { status: "confirmed" } }),
      this.prisma.order.count({ where: unassignedWhere }),
      this.prisma.order.count({
        where: { status: { in: [...IN_DELIVERY_STATUSES] } },
      }),
      this.prisma.order.aggregate({
        where: {
          paymentMethod: "cash_on_delivery",
          paymentStatus: "unpaid",
          status: { not: "cancelled" },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          paymentMethod: "cash_on_delivery",
          paymentStatus: "unpaid",
          status: { not: "cancelled" },
        },
      }),
      this.prisma.companyProfile.count({ where: { status: "pending" } }),
      this.prisma.user.count({
        where: { role: "delivery_agent", isActive: true },
      }),
      this.prisma.product.count({
        where: { stockQuantity: { lte: LOW_STOCK_THRESHOLD } },
      }),
      this.prisma.product.count({
        where: { stockQuantity: { lte: 0 } },
      }),
      this.prisma.product.count({
        where: { stockQuantity: { gt: 0 } },
      }),
      this.prisma.order.count({ where: { status: "delivered" } }),
      this.prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.order.count({
        where: { status: "confirmed", deliveryAgentId: null },
      }),
      this.prisma.order.count({ where: { status: "assigned" } }),
      this.prisma.order.count({ where: { status: "accepted" } }),
      this.prisma.order.count({ where: { status: "picked_up" } }),
      this.prisma.order.count({ where: { status: "on_the_way" } }),
      this.prisma.order.findMany({
        where: activeMapWhere,
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          paymentStatus: true,
          paymentMethod: true,
          createdAt: true,
          user: { select: { fullName: true, phone: true } },
          deliveryAgent: { select: { fullName: true } },
          address: {
            select: {
              label: true,
              city: true,
              street: true,
              governorate: true,
              district: true,
              settlementId: true,
              locationEncrypted: true,
              locationHash: true,
              hasExactLocation: true,
              locationAccuracyM: true,
              locationCapturedAt: true,
              fullName: true,
              phone: true,
              country: true,
              building: true,
              floor: true,
              apartment: true,
              postalCode: true,
              isDefault: true,
            },
          },
        },
      }),
      this.prisma.order.count({
        where: activeMapWhere,
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          paymentStatus: true,
          createdAt: true,
          user: { select: { fullName: true } },
          deliveryAgent: { select: { fullName: true } },
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      this.prisma.user.findMany({
        where: { role: "delivery_agent", isActive: true },
        select: {
          id: true,
          fullName: true,
          phone: true,
          isActive: true,
          _count: {
            select: {
              assignedOrders: {
                where: { status: { in: [...IN_DELIVERY_STATUSES] } },
              },
            },
          },
        },
        orderBy: { fullName: "asc" },
        take: 20,
      }),
      this.prisma.product.findMany({
        where: { stockQuantity: { lte: LOW_STOCK_THRESHOLD } },
        orderBy: { stockQuantity: "asc" },
        take: 5,
        select: {
          id: true,
          name: true,
          sku: true,
          stockQuantity: true,
          category: { select: { name: true } },
        },
      }),
      this.prisma.companyProfile.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          createdAt: true,
          status: true,
        },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: start7d } },
        select: {
          createdAt: true,
          totalAmount: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          deliveryProof: { select: { deliveredAt: true } },
          updatedAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: start30d } },
        select: {
          createdAt: true,
          totalAmount: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          deliveryProof: { select: { deliveredAt: true } },
          updatedAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: activeMapWhere,
        select: { address: { select: { city: true } } },
      }),
    ]);

    const orderStatusBreakdown = emptyStatusBreakdown();
    for (const row of statusGroups) {
      const key = row.status as keyof typeof orderStatusBreakdown;
      if (key in orderStatusBreakdown) {
        orderStatusBreakdown[key] = row._count._all;
      }
    }

    const codUnpaidAmount = decimalToNumber(codUnpaidAgg._sum.totalAmount || 0);
    const totalRevenue = decimalToNumber(totalRevenueAgg._sum.totalAmount || 0);
    const todayRevenue = decimalToNumber(todayRevenueAgg._sum.totalAmount || 0);

    const summary = {
      totalOrders,
      totalRevenue,
      totalUsers,
      totalProducts,
      totalCompanies,
      totalDrivers,
      todayOrders,
      todayRevenue,
      deliveredTodayCount,
      pendingOrdersCount,
      confirmedOrdersCount,
      unassignedOrdersCount,
      inDeliveryOrdersCount,
      codUnpaidAmount,
      pendingCompanyApprovalsCount,
      lowStockProductsCount,
      soldOutProductsCount,
      inStockProductsCount,
      activeDeliveryAgentsCount,
      completedOrders,
    };

    const deliveryPipeline = {
      toPrepare: pendingOrdersCount,
      readyForDriver: ordersReadyForDriverCount,
      assigned: assignedCount,
      accepted: acceptedCount,
      pickedUp: pickedUpCount,
      outForDelivery: onTheWayCount,
      deliveredToday: deliveredTodayCount,
    };

    const buildTrend = (orders: typeof ordersForTrend7, days: number) => {
      const buckets = new Map<
        string,
        {
          ordersCount: number;
          revenue: number;
          deliveredCount: number;
          codAmount: number;
        }
      >();
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(getBeirutStartOfDay(now).getTime() - i * 86400000);
        buckets.set(getBeirutDateKey(d), {
          ordersCount: 0,
          revenue: 0,
          deliveredCount: 0,
          codAmount: 0,
        });
      }
      for (const o of orders) {
        const key = getBeirutDateKey(o.createdAt);
        const bucket = buckets.get(key);
        if (!bucket) continue;
        bucket.ordersCount += 1;
        if (o.status === "delivered") {
          const deliveredAt = o.deliveryProof?.deliveredAt ?? o.updatedAt;
          if (getBeirutDateKey(deliveredAt) === key) {
            bucket.deliveredCount += 1;
            bucket.revenue += decimalToNumber(o.totalAmount);
          }
        }
        if (
          o.paymentMethod === "cash_on_delivery" &&
          o.paymentStatus === "paid" &&
          o.status === "delivered"
        ) {
          const deliveredAt = o.deliveryProof?.deliveredAt ?? o.updatedAt;
          if (getBeirutDateKey(deliveredAt) === key) {
            bucket.codAmount += decimalToNumber(o.totalAmount);
          }
        }
      }
      return Array.from(buckets.entries()).map(([date, v]) => ({
        date,
        ...v,
      }));
    };

    const productIds = topProductGroups.map((g) => g.productId);
    const productsMeta =
      productIds.length > 0
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, stockQuantity: true },
          })
        : [];
    const productMap = new Map(productsMeta.map((p) => [p.id, p]));

    const topProducts = topProductGroups.map((g) => {
      const meta = productMap.get(g.productId);
      return {
        productId: g.productId,
        name: meta?.name ?? "Unknown product",
        quantitySold: g._sum.quantity ?? 0,
        revenue: decimalToNumber(g._sum.totalPrice || 0),
        stockQuantity: meta?.stockQuantity ?? 0,
      };
    });

    const busyDrivers = busyAgentsRaw
      .map((agent) => ({
        id: agent.id,
        fullName: agent.fullName,
        phone: agent.phone,
        isActive: agent.isActive,
        activeOrderCount: agent._count.assignedOrders,
      }))
      .sort((a, b) => b.activeOrderCount - a.activeOrderCount)
      .slice(0, 5);

    const cityCounts = new Map<string, number>();
    for (const o of ordersByCityRaw) {
      const city = o.address?.city?.trim() || "Unknown";
      cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    }
    const ordersByCity = Array.from(cityCounts.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const mapOrders = mapOrdersRaw
      .map((o) => {
        const base = {
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: decimalToNumber(o.totalAmount),
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod,
          customerName: o.user?.fullName ?? null,
          customerPhone: o.user?.phone ?? null,
          addressLabel: o.address?.label ?? null,
          addressCity: o.address?.city ?? null,
          addressGovernorate: o.address?.governorate ?? null,
          addressDistrict: o.address?.district ?? null,
          deliveryAgentName: o.deliveryAgent?.fullName ?? null,
          createdAt: o.createdAt.toISOString(),
        };

        if (o.address?.hasExactLocation && o.address.locationEncrypted) {
          const coords = this.addressesService.decryptCoords(
            o.address.locationEncrypted,
            o.address.locationHash,
          );
          if (coords) {
            return {
              ...base,
              latitude: coords.latitude,
              longitude: coords.longitude,
              locationPrecision: "exact" as const,
            };
          }
        }

        // Fallback: place pin on Lebanon basemap settlement / city centroid
        if (o.address?.settlementId) {
          const settlement = this.locationsService.findOneInternal(
            o.address.settlementId,
          );
          if (settlement) {
            return {
              ...base,
              latitude: settlement.latitude,
              longitude: settlement.longitude,
              locationPrecision: "settlement" as const,
            };
          }
        }

        if (o.address?.city) {
          const match = this.locationsService.findByName({
            name: o.address.city,
            governorate: o.address.governorate,
            district: o.address.district,
          });
          if (match) {
            return {
              ...base,
              latitude: match.latitude,
              longitude: match.longitude,
              locationPrecision: "settlement" as const,
            };
          }
        }

        return null;
      })
      .filter((o): o is NonNullable<typeof o> => o != null);

    const mapOrdersWithoutCoordinates = Math.max(
      0,
      activeOrdersForMapCount - mapOrders.length,
    );

    return {
      summary,
      salesTrend: {
        days7: buildTrend(ordersForTrend7, 7),
        days30: buildTrend(ordersForTrend30, 30),
      },
      orderStatusBreakdown,
      deliveryPipeline,
      mapOrders,
      mapOrdersWithoutCoordinates,
      recentOrders: recentOrdersRaw.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.user?.fullName ?? null,
        status: o.status,
        totalAmount: decimalToNumber(o.totalAmount),
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt.toISOString(),
        deliveryAgentName: o.deliveryAgent?.fullName ?? null,
      })),
      topProducts,
      busyDrivers,
      pendingCompanies: pendingCompaniesRaw.map((c) => ({
        id: c.id,
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        contactName: c.contactPerson,
        createdAt: c.createdAt.toISOString(),
        status: c.status,
      })),
      lowStockProducts: lowStockProductsRaw.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        categoryName: p.category?.name ?? null,
      })),
      attentionItems: {
        needsDriver: unassignedOrdersCount,
        toPrepare: pendingOrdersCount,
        lowStock: lowStockProductsCount,
        pendingCompanies: pendingCompanyApprovalsCount,
        cashToCollect: codUnpaidOrdersCount,
      },
      ordersByCity,
    };
  }

  async getUsers(query: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const status = query.status || "active";

    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role as never } : {}),
    };

    if (status === "pending") {
      where.role = "company";
      where.companyProfile = { is: { status: "pending" } };
    } else if (status === "rejected") {
      where.role = "company";
      where.companyProfile = { is: { status: "rejected" } };
    } else if (status === "inactive") {
      where.isActive = false;
      where.OR = [
        { role: { not: "company" } },
        { companyProfile: { is: { status: "approved" } } },
      ];
    } else {
      // active — exclude wholesale applicants still awaiting / denied approval
      where.isActive = true;
      where.OR = [
        { role: { not: "company" } },
        { companyProfile: { is: { status: "approved" } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { companyProfile: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map(sanitizeUser),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async activateUser(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      include: { companyProfile: true },
    });
    return sanitizeUser(user);
  }

  async deactivateUser(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: { companyProfile: true },
    });
    return sanitizeUser(user);
  }

  async deleteUser(id: string, adminId: string) {
    if (id === adminId) {
      throw new ForbiddenException("You cannot delete your own account");
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role === "admin") {
      throw new ForbiddenException("Admin accounts cannot be deleted");
    }

    const [customerOrders, assignedOrders, deliveryProofs] = await Promise.all([
      this.prisma.order.count({ where: { userId: id } }),
      this.prisma.order.count({ where: { deliveryAgentId: id } }),
      this.prisma.deliveryProof.count({ where: { deliveryAgentId: id } }),
    ]);

    if (customerOrders > 0 || assignedOrders > 0 || deliveryProofs > 0) {
      throw new BadRequestException(
        "This user has order history. Deactivate the account instead of deleting.",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderStatusHistory.updateMany({
        where: { changedByUserId: id },
        data: { changedByUserId: null },
      });
      await tx.review.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    return { message: "User deleted" };
  }

  /** Permanently remove all company accounts that were rejected. */
  async deleteAllRejectedCompanyUsers(adminId: string) {
    const rejected = await this.prisma.user.findMany({
      where: {
        role: "company",
        id: { not: adminId },
        companyProfile: { is: { status: "rejected" } },
      },
      select: { id: true },
    });

    let deleted = 0;
    let skipped = 0;

    for (const user of rejected) {
      try {
        await this.deleteUser(user.id, adminId);
        deleted += 1;
      } catch {
        skipped += 1;
      }
    }

    return {
      message: `Removed ${deleted} rejected company user(s)`,
      deleted,
      skipped,
    };
  }

  async getCompanyAccounts(status?: string) {
    const filter = status || "pending";
    let where: Prisma.CompanyProfileWhereInput;

    if (filter === "pending") {
      where = { status: "pending" };
    } else if (filter === "rejected") {
      where = { status: "rejected" };
    } else if (filter === "inactive") {
      where = { status: "approved", user: { isActive: false } };
    } else if (filter === "active") {
      where = { status: "approved", user: { isActive: true } };
    } else if (filter === "approved") {
      // Legacy query from older UI / dashboard links
      where = { status: "approved" };
    } else {
      where = {};
    }

    return this.prisma.companyProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveCompany(id: string) {
    const profile = await this.prisma.companyProfile.update({
      where: { id },
      data: {
        status: "approved",
        user: { update: { isActive: true } },
      },
      include: { user: true },
    });

    await this.notifications.notifyCompanyStatusChange(
      {
        userId: profile.user.id,
        email: profile.user.email,
        phone: profile.companyPhone || profile.user.phone,
        fullName: profile.user.fullName,
        companyName: profile.companyName,
      },
      "approved",
    );

    return profile;
  }

  async rejectCompany(id: string) {
    const profile = await this.prisma.companyProfile.update({
      where: { id },
      data: {
        status: "rejected",
        user: { update: { isActive: false } },
      },
      include: { user: true },
    });

    await this.notifications.notifyCompanyStatusChange(
      {
        userId: profile.user.id,
        email: profile.user.email,
        phone: profile.companyPhone || profile.user.phone,
        fullName: profile.user.fullName,
        companyName: profile.companyName,
      },
      "rejected",
    );

    return profile;
  }

  async createDeliveryAgent(dto: CreateDeliveryAgentDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException("Email already exists");

    const passwordHash = await this.authService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: "delivery_agent",
      },
    });
    return sanitizeUser(user);
  }

  async getDeliveryAgents() {
    const agents = await this.prisma.user.findMany({
      where: { role: "delivery_agent" },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            assignedOrders: {
              where: {
                status: {
                  in: ["assigned", "accepted", "picked_up", "on_the_way"],
                },
              },
            },
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    return agents.map((agent) => ({
      id: agent.id,
      email: agent.email,
      fullName: agent.fullName,
      phone: agent.phone,
      isActive: agent.isActive,
      createdAt: agent.createdAt,
      activeOrderCount: agent._count.assignedOrders,
    }));
  }

  async getAllReviews() {
    return this.prisma.review.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
