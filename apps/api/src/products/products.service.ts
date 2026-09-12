import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber } from '../common/utils';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private formatProduct(product: Record<string, unknown>) {
    return {
      ...product,
      normalPrice: decimalToNumber(product.normalPrice as never),
      companyPrice: product.companyPrice === null ? null : decimalToNumber(product.companyPrice as never),
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
    includeInactive?: boolean;
    active?: boolean;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = query.includeInactive ? {} : { isActive: true };
    if (query.active !== undefined) where.isActive = query.active;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.featured) where.isFeatured = true;
    if (query.search) {
      where.OR = [
        { barcode: { equals: query.search } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { nameAr: { contains: query.search, mode: 'insensitive' } },
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.minPrice || query.maxPrice) {
      where.normalPrice = {};
      if (query.minPrice) (where.normalPrice as Record<string, number>).gte = query.minPrice;
      if (query.maxPrice) (where.normalPrice as Record<string, number>).lte = query.maxPrice;
    }

    const sortOrder = query.sortOrder || (query.sortBy === 'price' ? 'asc' : 'desc');
    let orderBy: Record<string, string> | Record<string, string>[] = {
      createdAt: sortOrder,
    };
    if (query.sortBy === 'price') orderBy = { normalPrice: sortOrder };
    else if (query.sortBy === 'rating') orderBy = { ratingAverage: sortOrder };
    else if (query.sortBy === 'sold') {
      orderBy = [{ soldCount: sortOrder }, { ratingAverage: 'desc' }];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, subcategory: true },
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
      include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, subcategory: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.formatProduct(product as unknown as Record<string, unknown>);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, subcategory: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.formatProduct(product as unknown as Record<string, unknown>);
  }

  async create(dto: CreateProductDto) {
    this.assertSafeImageUrls(dto.imageUrl, dto.images);
    const { images, slug: requestedSlug, sku: requestedSku, ...rest } = dto;
    const slug = requestedSlug?.trim() || await this.createUniqueSlug(dto.name);
    const sku = requestedSku?.trim() || `NP-${randomUUID().slice(0, 8).toUpperCase()}`;
    const product = await this.prisma.product.create({
      data: {
        ...rest,
        slug,
        sku,
        images: images?.length
          ? { create: images.map((url, i) => ({ imageUrl: url, sortOrder: i })) }
          : undefined,
      },
      include: { images: true, category: true, subcategory: true },
    });
    return this.formatProduct(product as unknown as Record<string, unknown>);
  }

  private async createUniqueSlug(name: string): Promise<string> {
    const base = name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product';

    let slug = base;
    let suffix = 2;
    while (await this.prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    this.assertSafeImageUrls(dto.imageUrl, dto.images);
    const { images, ...rest } = dto;
    const product = await this.prisma.product.update({
      where: { id },
      data: rest,
      include: { images: true, category: true, subcategory: true },
    });
    if (images) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
      await this.prisma.productImage.createMany({
        data: images.map((url, i) => ({ productId: id, imageUrl: url, sortOrder: i })),
      });
    }
    return this.findOne(id);
  }

  private assertSafeImageUrls(primary?: string, images?: string[]) {
    for (const value of [primary, ...(images ?? [])].filter(Boolean) as string[]) {
      if (/^\/uploads\/products\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(value)) continue;
      try {
        const url = new URL(value);
        if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password) {
          continue;
        }
      } catch {
        // Handled by the generic validation error below.
      }
      throw new BadRequestException('Product images must use HTTP(S) URLs or a valid uploaded image');
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }
}
