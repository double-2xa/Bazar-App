import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async getProductReviews(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId, status: 'delivered' },
      include: { items: true },
    });
    if (!order) throw new BadRequestException('Order not found or not delivered');
    const hasProduct = order.items.some((i) => i.productId === dto.productId);
    if (!hasProduct) throw new BadRequestException('Product not in this order');

    const existing = await this.prisma.review.findUnique({
      where: {
        userId_productId_orderId: {
          userId,
          productId: dto.productId,
          orderId: dto.orderId,
        },
      },
    });
    if (existing) throw new BadRequestException('Review already submitted');

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: { userId, ...dto },
        include: { user: { select: { fullName: true } } },
      });

      const stats = await tx.review.aggregate({
        where: { productId: dto.productId },
        _avg: { rating: true },
        _count: true,
      });

      await tx.product.update({
        where: { id: dto.productId },
        data: {
          ratingAverage: stats._avg.rating || 0,
          ratingCount: stats._count,
        },
      });

      return created;
    });

    return review;
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    await this.prisma.review.delete({ where: { id } });

    const stats = await this.prisma.review.aggregate({
      where: { productId: review.productId },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.product.update({
      where: { id: review.productId },
      data: { ratingAverage: stats._avg.rating || 0, ratingCount: stats._count },
    });

    return { message: 'Review deleted' };
  }
}
