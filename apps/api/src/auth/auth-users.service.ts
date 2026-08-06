import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService as TokenService } from './auth.service';
import { sanitizeUser } from '../common/utils';
import { RegisterDto, RegisterCompanyDto, LoginDto, GoogleAuthDto } from './dto/auth.dto';

@Injectable()
export class AuthUsersService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  private googleAudiences(): string[] {
    return [
      process.env.GOOGLE_CLIENT_ID_WEB,
      process.env.GOOGLE_CLIENT_ID_IOS,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
    ].filter((id): id is string => !!id && id.length > 0);
  }

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
        authProvider: 'local',
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
        authProvider: 'local',
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

    if (!user.passwordHash) {
      throw new UnauthorizedException('This account uses Google Sign-In. Continue with Google instead.');
    }

    const valid = await this.tokenService.comparePassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.role);
    return { user: sanitizeUser(user), tokens };
  }

  async googleLogin(dto: GoogleAuthDto) {
    const audiences = this.googleAudiences();
    if (audiences.length === 0) {
      throw new BadRequestException('Google Sign-In is not configured on the server');
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: audiences,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Google account email is required');
    }

    if (payload.email_verified === false) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const fullName = payload.name?.trim() || email.split('@')[0];

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: { companyProfile: true },
    });

    if (user) {
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }
      if (user.role !== 'normal_user') {
        throw new ForbiddenException('Google Sign-In is only available for customer accounts');
      }

      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            authProvider: user.passwordHash ? user.authProvider : 'google',
            fullName: user.fullName || fullName,
          },
          include: { companyProfile: true },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          googleId,
          fullName,
          passwordHash: null,
          authProvider: 'google',
          role: 'normal_user',
        },
        include: { companyProfile: true },
      });
    }

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
