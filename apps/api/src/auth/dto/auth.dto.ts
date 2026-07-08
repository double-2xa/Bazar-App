import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
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

export class RegisterCompanyDto extends RegisterDto {
  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsString()
  @MinLength(2)
  vatNumber!: string;

  @IsString()
  @MinLength(5)
  businessAddress!: string;

  @IsString()
  @MinLength(2)
  contactPerson!: string;

  @IsString()
  @MinLength(5)
  companyPhone!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
