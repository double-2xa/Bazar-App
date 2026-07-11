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
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, PriceType } from '@prisma/client';
import { ORDER_STATUSES } from '@doublea/shared';

class OrderItemInput {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsEnum(PriceType)
  selectedPriceType?: PriceType;
}

export class CreateOrderDto {
  @IsUUID()
  addressId!: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  customerNote?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];
}

export class UpdateOrderStatusDto {
  @IsIn([...ORDER_STATUSES])
  status!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignDeliveryAgentDto {
  @IsUUID()
  deliveryAgentId!: string;
}
