import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Expo } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PushReceiptService {
  private readonly logger = new Logger(PushReceiptService.name);
  private readonly expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  @Interval('expo-push-receipts', 5 * 60 * 1000)
  async check() {
    if (this.running) return;
    this.running = true;
    const lock = await this.redis.acquireLock('expo-push-receipts', 4 * 60 * 1000);
    if (!lock) { this.running = false; return; }
    try {
      const rows = await this.prisma.pushReceipt.findMany({
        where: { checkAfter: { lte: new Date() } }, orderBy: { checkAfter: 'asc' }, take: 1000,
      });
      for (const chunk of this.expo.chunkPushNotificationReceiptIds(rows.map((row) => row.ticketId))) {
        try {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
          for (const ticketId of chunk) {
            const receipt = receipts[ticketId];
            const row = rows.find((item) => item.ticketId === ticketId)!;
            if (!receipt) {
              if (row.attempts >= 7) await this.prisma.pushReceipt.delete({ where: { ticketId } });
              else await this.prisma.pushReceipt.update({ where: { ticketId }, data: { attempts: { increment: 1 }, checkAfter: new Date(Date.now() + 5 * 60 * 1000) } });
              continue;
            }
            if (receipt.status === 'error') {
              this.logger.warn(`Push receipt failed: ${receipt.details?.error || receipt.message}`);
              if (receipt.details?.error === 'DeviceNotRegistered') {
                await this.prisma.pushToken.updateMany({ where: { token: row.token }, data: { isActive: false } });
              }
            }
            await this.prisma.pushReceipt.delete({ where: { ticketId } });
          }
        } catch (error) {
          this.logger.warn(`Push receipt check failed: ${(error as Error).message}`);
        }
      }
    } finally {
      await this.redis.releaseLock('expo-push-receipts', lock);
      this.running = false;
    }
  }
}
