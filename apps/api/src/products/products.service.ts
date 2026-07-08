import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber } from '../common/utils';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private formatProduct(product: Record<string, unknown>) {
    return {
      ...product,
      normalPrice: decimalToNumber(product.normalPrice as never),
      companyPrice: decimalToNumber(product.companyPrice as never),
    };
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    featured?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    minPrice?: number;
    maxPrice?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.featured) where.isFeatured = true;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.minPrice || query.maxPrice) {
      where.normalPrice = {};
      if (query.minPrice) (where.normalPrice as Record<string, number>).gte = query.minPrice;
      if (query.maxPrice) (where.normalPrice as Record<string, number>).lte = query.maxPrice;
    }

    const orderBy: Record<string, string> = {};
    if (query.sortBy === 'price') orderBy.normalPrice = query.sortOrder || 'asc';
    else if (query.sortBy === 'rating') orderBy.ratingAverage = query.sortOrder || 'desc';
    else orderBy.createdAt = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { images: { orderBy: { sortOrder: 'asc' } }, category: true },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map((p) => this.formatProduct(p as unknown as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: 'asc' } }, category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.formatProduct(product as unknown as Record<string, unknown>);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { images: { orderBy: { sortOrder: 'asc' } }, category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.formatProduct(product as unknown as Record<string, unknown>);
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        ...dto,
        images: dto.images?.length
          ? { create: dto.images.map((url, i) => ({ imageUrl: url, sortOrder: i })) }
          : undefined,
      },
      include: { images: true, category: true },
    });
    return this.formatProduct(product as unknown as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { images, ...rest } = dto;
    const product = await this.prisma.product.update({
      where: { id },
      data: rest,
      include: { images: true, category: true },
    });
    if (images) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
      await this.prisma.productImage.createMany({
        data: images.map((url, i) => ({ productId: id, imageUrl: url, sortOrder: i })),
      });
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }
}
