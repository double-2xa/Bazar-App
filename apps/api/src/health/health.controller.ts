import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
@Public()
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      async () => {
        await Promise.race([
          this.prisma.$queryRaw`SELECT 1`,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database readiness timeout')), 2000)),
        ]);
        return { database: { status: 'up' as const } };
      },
      async () => {
        await Promise.race([
          this.redis.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis readiness timeout')), 1000)),
        ]);
        return { redis: { status: 'up' as const } };
      },
    ]);
  }
}
