import { IsBoolean, IsEmail, IsEnum, IsIn, IsString, MinLength, IsOptional } from 'class-validator';
import { OrderStatus, UserRole } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class AdminUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsIn(['pending', 'rejected', 'active', 'inactive'])
  status?: 'pending' | 'rejected' | 'active' | 'inactive';
}

export class AdminOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsIn(['active', 'archive'])
  scope?: 'active' | 'archive';
}

export class CreateAdminUserDto {
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

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  companyPhone?: string;
}

export class UpdateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  companyPhone?: string;
}

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

export class UpdateDeliveryAgentDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsBoolean()
  isActive!: boolean;
}
