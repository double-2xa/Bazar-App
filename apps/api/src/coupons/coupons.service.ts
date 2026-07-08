import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { decimalToNumber } from '../common/utils';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  private format(coupon: Record<string, unknown>) {
    return {
      ...coupon,
      value: decimalToNumber(coupon.value as never),
      minOrderAmount: decimalToNumber(coupon.minOrderAmount as never),
    };
  }

  async findAll() {
    const coupons = await this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return coupons.map((c) => this.format(c as unknown as Record<string, unknown>));
  }

  async create(dto: CreateCouponDto) {
    const coupon = await this.prisma.coupon.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });
    return this.format(coupon as unknown as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: dto.code ? { ...dto, code: dto.code.toUpperCase() } : dto,
    });
    return this.format(coupon as unknown as Record<string, unknown>);
  }

  async remove(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'Coupon deleted' };
  }
}
