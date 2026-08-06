import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
          },
        },
      },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
            },
          },
        },
      });
    }
    return this.formatCart(cart);
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
            companyPrice: decimalToNumber(
              (item.product as Record<string, unknown>).companyPrice as never,
            ),
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
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || !product.isActive) throw new NotFoundException('Product not found');
    if (product.stockQuantity < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const priceType = dto.selectedPriceType || 'normal';
    if (priceType === 'company') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { companyProfile: true },
      });
      if (user?.role !== 'company' || user.companyProfile?.status !== 'approved') {
        throw new BadRequestException('Company pricing not available');
      }
    }

    const cart = await this.getOrCreateCart(userId);
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        selectedPriceType: priceType,
      },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
          selectedPriceType: priceType,
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    await this.assertUserCanUseCart(userId);
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    if (item.product.stockQuantity < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    await this.assertUserCanUseCart(userId);
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string) {
    await this.assertUserCanUseCart(userId);
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getOrCreateCart(userId);
  }
}
