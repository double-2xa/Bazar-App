import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { sanitizeUser } from '../common/utils';
import { CreateDeliveryAgentDto } from './dto/admin.dto';
import { decimalToNumber } from '../common/utils';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async getDashboardStats() {
    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      totalUsers,
      totalCompanyAccounts,
      totalProducts,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: { status: 'delivered' },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.order.count({ where: { status: 'delivered' } }),
      this.prisma.user.count({ where: { role: 'normal_user' } }),
      this.prisma.companyProfile.count({ where: { status: 'approved' } }),
      this.prisma.product.count(),
    ]);

    return {
      totalOrders,
      totalRevenue: decimalToNumber(totalRevenue._sum.totalAmount || 0),
      pendingOrders,
      completedOrders,
      totalUsers,
      totalCompanyAccounts,
      totalProducts,
    };
  }

  async getUsers(query: { page?: number; limit?: number; role?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = query.role ? { role: query.role as never } : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { companyProfile: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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

  async getCompanyAccounts(status?: string) {
    return this.prisma.companyProfile.findMany({
      where: status ? { status: status as never } : undefined,
      include: { user: { select: { id: true, email: true, fullName: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveCompany(id: string) {
    return this.prisma.companyProfile.update({
      where: { id },
      data: { status: 'approved' },
      include: { user: true },
    });
  }

  async rejectCompany(id: string) {
    return this.prisma.companyProfile.update({
      where: { id },
      data: { status: 'rejected' },
      include: { user: true },
    });
  }

  async createDeliveryAgent(dto: CreateDeliveryAgentDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already exists');

    const passwordHash = await this.authService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: 'delivery_agent',
      },
    });
    return sanitizeUser(user);
  }

  async getAllReviews() {
    return this.prisma.review.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
