import { Body, Controller, Get, Ip, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public, Roles } from '../common/decorators/roles.decorator';
import { RecordWebsiteVisitDto, TrafficQueryDto } from './dto/traffic.dto';
import { TrafficService } from './traffic.service';

@Controller('traffic')
export class TrafficController {
  constructor(private readonly traffic: TrafficService) {}

  @Public()
  @Post('visit')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  record(@Body() dto: RecordWebsiteVisitDto, @Req() request: Request, @Ip() ip: string) {
    return this.traffic.record(dto, {
      ip,
      userAgent: request.get('user-agent') || null,
      countryCode: request.get('cf-ipcountry') || null,
    });
  }

  @Roles('admin')
  @Get('dashboard')
  dashboard(@Query() query: TrafficQueryDto) {
    return this.traffic.dashboard(Number(query.days), query.page, query.limit);
  }
}
