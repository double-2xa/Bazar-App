import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertCompanyCanShop, decimalToNumber } from '../common/utils';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private async assertUserCanUseCart(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companyProfile: true },
    });
    assertCompanyCanShop(user);
  }

  private async getOrCreateCart(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        items: {
          include: {
            product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
          },
        },
      },
    });
    return this.formatCart(cart);
  }

  private async serializable<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 3) continue;
        throw error;
      }
    }
    throw new ConflictException('Cart changed concurrently. Please retry.');
  }

  private formatCart(cart: Record<string, unknown>) {
    const items = (cart.items as Record<string, unknown>[])?.map((item) => ({
      ...item,
      product: item.product
        ? {
            ...(item.product as Record<string, unknown>),
            normalPrice: decimalToNumber(
              (item.product as Record<string, unknown>).normalPrice as never,
            ),
            companyPrice: (item.product as Record<string, unknown>).companyPrice === null
              ? null
              : decimalToNumber((item.product as Record<string, unknown>).companyPrice as never),
          }
        : undefined,
    }));
    return { ...cart, items } as { id: string; items: unknown[] };
  }

  async getCart(userId: string) {
    await this.assertUserCanUseCart(userId);
    return this.getOrCreateCart(userId);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    await this.assertUserCanUseCart(userId);
    const priceType = dto.selectedPriceType || 'normal';
    await this.serializable(async (tx) => {
      const [user, product] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, include: { companyProfile: true } }),
        tx.product.findUnique({ where: { id: dto.productId } }),
      ]);
      if (!product || !product.isActive) throw new NotFoundException('Product not found');
      if (priceType === 'company' && (user?.role !== 'company' || user.companyProfile?.status !== 'approved')) {
        throw new BadRequestException('Company pricing not available');
      }
      if (priceType === 'company' && product.companyPrice === null) {
        throw new BadRequestException('Wholesale pricing is not available for this product');
      }
      const cart = await tx.cart.upsert({ where: { userId }, create: { userId }, update: {} });
      const existing = await tx.cartItem.findUnique({
        where: { cartId_productId_selectedPriceType: { cartId: cart.id, productId: dto.productId, selectedPriceType: priceType } },
      });
      const quantity = (existing?.quantity || 0) + dto.quantity;
      if (quantity > product.stockQuantity) throw new BadRequestException('Insufficient stock');
      await tx.cartItem.upsert({
        where: { cartId_productId_selectedPriceType: { cartId: cart.id, productId: dto.productId, selectedPriceType: priceType } },
        create: { cartId: cart.id, productId: dto.productId, quantity, selectedPriceType: priceType },
        update: { quantity },
      });
    });

    return this.getOrCreateCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    await this.assertUserCanUseCart(userId);
    await this.serializable(async (tx) => {
      const item = await tx.cartItem.findFirst({
        where: { id: itemId, cart: { userId } }, include: { product: true },
      });
      if (!item) throw new NotFoundException('Cart item not found');
      if (item.product.stockQuantity < dto.quantity) throw new BadRequestException('Insufficient stock');
      await tx.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
    });
    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    await this.assertUserCanUseCart(userId);
    const removed = await this.prisma.cartItem.deleteMany({ where: { id: itemId, cart: { userId } } });
    if (removed.count === 0) throw new NotFoundException('Cart item not found');
    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string) {
    await this.assertUserCanUseCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cart: { userId } } });
    return this.getOrCreateCart(userId);
  }
}
