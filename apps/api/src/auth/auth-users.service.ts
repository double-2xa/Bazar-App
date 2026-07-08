import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService as TokenService } from './auth.service';
import { sanitizeUser } from '../common/utils';
import { RegisterDto, RegisterCompanyDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthUsersService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await this.tokenService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: 'normal_user',
      },
    });

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);
    return { user: sanitizeUser(user), tokens };
  }

  async registerCompany(dto: RegisterCompanyDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await this.tokenService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: 'company',
        companyProfile: {
          create: {
            companyName: dto.companyName,
            vatNumber: dto.vatNumber,
            businessAddress: dto.businessAddress,
            contactPerson: dto.contactPerson,
            companyPhone: dto.companyPhone,
            status: 'pending',
          },
        },
      },
      include: { companyProfile: true },
    });

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);
    return { user: sanitizeUser(user), tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { companyProfile: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.tokenService.comparePassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);
    return { user: sanitizeUser(user), tokens };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companyProfile: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return sanitizeUser(user);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new BadRequestException('Refresh token required');
    return this.tokenService.refreshTokens(refreshToken);
  }

  async logout(refreshToken: string) {
    return this.tokenService.logout(refreshToken);
  }
}
