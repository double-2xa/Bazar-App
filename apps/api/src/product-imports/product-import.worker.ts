import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import { ProductImportsService } from './product-imports.service';

@Injectable()
export class ProductImportWorker {
  private readonly logger = new Logger(ProductImportWorker.name);
  private localRunning = false;

  constructor(private readonly imports: ProductImportsService, private readonly redis: RedisService) {}

  @Interval(3000)
  async processQueue() {
    if (this.localRunning) return;
    this.localRunning = true;
    const lock = await this.redis.acquireLock('product-import-worker', 10 * 60_000);
    try {
      if (lock || process.env.NODE_ENV !== 'production') await this.imports.processNextQueuedBatch();
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Product import worker failed');
    } finally {
      if (lock) await this.redis.releaseLock('product-import-worker', lock);
      this.localRunning = false;
    }
  }
}
