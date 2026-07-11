import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';

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

export class DeliveryRejectDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
