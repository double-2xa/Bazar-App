import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common';
import { AuthUsersService } from './auth-users.service';
import { LoginDto, RegisterDto, RegisterCompanyDto, RefreshTokenDto, GoogleAuthDto } from './dto/auth.dto';
import { Public } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private authUsersService: AuthUsersService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  register(@Body() dto: RegisterDto) {
    return this.authUsersService.register(dto);
  }

  @Public()
  @Post('register-company')
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @HttpCode(200)
  registerCompany(@Body() dto: RegisterCompanyDto) {
    return this.authUsersService.registerCompany(dto);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000, blockDuration: 300000 } })
  login(@Body() dto: LoginDto) {
    return this.authUsersService.login(dto);
  }

  @Public()
  @Post('google')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  googleLogin(@Body() dto: GoogleAuthDto) {
    return this.authUsersService.googleLogin(dto);
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authUsersService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authUsersService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser('sub') userId: string) {
    return this.authUsersService.getMe(userId);
  }
}
