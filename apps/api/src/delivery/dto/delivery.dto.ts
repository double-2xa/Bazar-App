import { IsOptional, IsString, IsNumber } from 'class-validator';

export class DeliveryProofDto {
  @IsOptional()
  @IsString()
  deliveredToName?: string;

  @IsOptional()
  @IsString()
  deliveryNote?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
