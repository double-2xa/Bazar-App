import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateDeliveryAgentDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
