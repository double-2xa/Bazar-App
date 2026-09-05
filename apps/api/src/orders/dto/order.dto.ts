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
  IsEmail,
  IsBoolean,
  IsNumber,
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

export class GuestAddressInputDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsString()
  @MaxLength(120)
  district!: string;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  settlementId?: string;

  @IsString()
  @MaxLength(300)
  street!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  building?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  floor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  apartment?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  locationAccuracyM?: number;
}

export class CreateGuestOrderDto {
  @ValidateNested()
  @Type(() => GuestAddressInputDto)
  address!: GuestAddressInputDto;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsBoolean()
  whatsappOptIn?: boolean;

  @IsOptional()
  @IsIn(['cash_on_delivery', 'wish_money'])
  paymentMethod?: 'cash_on_delivery' | 'wish_money';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];
}

export class GuestDeliveryQuoteDto {
  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
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

export class PrepareOrderItemDto {
  @IsIn(['prepared', 'unavailable'])
  decision!: 'prepared' | 'unavailable';
}

export class AssignDeliveryAgentDto {
  @IsUUID()
  deliveryAgentId!: string;
}
