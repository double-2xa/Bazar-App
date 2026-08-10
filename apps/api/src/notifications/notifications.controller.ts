import { Body, Controller, Delete, Get, Patch, Param, Post, Query, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { RegisterPushTokenDto, UnregisterPushTokenDto } from './dto/push-token.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('push-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  register(@CurrentUser('sub') userId: string, @Body() dto: RegisterPushTokenDto) {
    return this.notifications.registerPushToken(userId, dto.token, dto.platform, dto.deviceId);
  }

  @Delete('push-token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  unregister(@CurrentUser('sub') userId: string, @Body() dto: UnregisterPushTokenDto) {
    return this.notifications.unregisterPushToken(userId, dto.token);
  }

  @Get()
  list(@CurrentUser('sub') userId: string, @Query('unreadOnly') unreadOnly?: string) {
    return this.notifications.listForUser(userId, { unreadOnly: unreadOnly === 'true', limit: 50 });
  }

  @Patch(':id/read')
  markRead(@CurrentUser('sub') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(userId, id);
  }
}
