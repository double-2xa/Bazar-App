import { IsUUID, IsInt, Min, IsOptional, IsEnum } from 'class-validator';
import { PriceType } from '@prisma/client';

export class AddCartItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsEnum(PriceType)
  selectedPriceType?: PriceType;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}
