import {
  IsUUID,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsIn,
  ArrayMinSize,
  ArrayMaxSize,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PriceType } from '@prisma/client';
import { ORDER_STATUSES } from '@doublea/shared';

class OrderItemInput {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @IsOptional()
  @IsEnum(PriceType)
  selectedPriceType?: PriceType;
}

export class CreateOrderDto {
  @IsUUID()
  addressId!: string;

  @IsOptional()
  @IsIn(['cash_on_delivery', 'wish_money'])
  paymentMethod?: 'cash_on_delivery' | 'wish_money';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];
}

export class UpdateOrderStatusDto {
  @IsIn([...ORDER_STATUSES])
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdatePaymentStatusDto {
  @IsIn(['unpaid', 'paid', 'refunded'])
  paymentStatus!: 'unpaid' | 'paid' | 'refunded';
}

export class AssignDeliveryAgentDto {
  @IsUUID()
  deliveryAgentId!: string;
}
