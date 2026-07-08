import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthUsersService } from './auth-users.service';
import { LoginDto, RegisterDto, RegisterCompanyDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authUsersService: AuthUsersService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authUsersService.register(dto);
  }

  @Public()
  @Post('register-company')
  registerCompany(@Body() dto: RegisterCompanyDto) {
    return this.authUsersService.registerCompany(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authUsersService.login(dto);
  }

  @Public()
  @Post('refresh')
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
