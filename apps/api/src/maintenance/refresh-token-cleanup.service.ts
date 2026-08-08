import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const BATCH_SIZE = 1000;

@Injectable()
export class RefreshTokenCleanupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  onApplicationBootstrap() { void this.cleanup(); }

  @Interval('expired-refresh-token-cleanup', CLEANUP_INTERVAL_MS)
  async cleanup() {
    if (this.running) return;
    this.running = true;
    const token = await this.redis.acquireLock('expired-refresh-token-cleanup', 5 * 60 * 1000);
    if (!token) { this.running = false; return; }
    let deleted = 0;
    try {
      for (let batch = 0; batch < 20; batch++) {
        const rows = await this.prisma.refreshToken.findMany({
          where: { expiresAt: { lt: new Date() } },
          select: { id: true },
          take: BATCH_SIZE,
          orderBy: { expiresAt: 'asc' },
        });
        if (rows.length === 0) break;
        const result = await this.prisma.refreshToken.deleteMany({
          where: { id: { in: rows.map((row) => row.id) }, expiresAt: { lt: new Date() } },
        });
        deleted += result.count;
        if (rows.length < BATCH_SIZE) break;
      }
      if (deleted > 0) this.logger.log(`Removed ${deleted} expired refresh tokens`);
    } finally {
      await this.redis.releaseLock('expired-refresh-token-cleanup', token);
      this.running = false;
    }
  }
}
