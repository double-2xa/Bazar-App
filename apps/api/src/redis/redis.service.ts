import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private readonly prefix = process.env.REDIS_KEY_PREFIX || 'bazar:v1';
  private readonly client: RedisClientType;
  private available = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 2000),
        reconnectStrategy: (retries) => Math.min(100 * 2 ** retries, 3000),
      },
    });
    this.client.on('ready', () => { this.available = true; });
    this.client.on('end', () => { this.available = false; });
    this.client.on('error', (error) => {
      this.available = false;
      this.logger.warn(`Redis unavailable: ${error.message}`);
    });
  }

  async onModuleInit() {
    void this.client.connect().catch((error: Error) => {
      this.logger.warn(`Starting without Redis; cache will fail open: ${error.message}`);
    });
  }

  async onApplicationShutdown() {
    if (this.client.isOpen) await this.client.quit().catch(() => this.client.destroy());
  }

  key(value: string) { return `${this.prefix}:${value}`; }

  async ping() {
    if (!this.client.isReady) throw new Error('Redis is not ready');
    return this.client.ping();
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client.isReady) return null;
    try {
      const value = await this.client.get(this.key(key));
      return value ? JSON.parse(value) as T : null;
    } catch { return null; }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number) {
    if (!this.client.isReady) return false;
    try {
      await this.client.set(this.key(key), JSON.stringify(value), { EX: ttlSeconds });
      return true;
    } catch { return false; }
  }

  async delete(key: string) {
    if (!this.client.isReady) return;
    await this.client.del(this.key(key)).catch(() => undefined);
  }

  async remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) return cached;

    const lockKey = `${key}:lock`;
    const token = randomUUID();
    let ownsLock = false;
    if (this.client.isReady) {
      ownsLock = (await this.client.set(this.key(lockKey), token, { NX: true, PX: 5000 }).catch(() => null)) === 'OK';
    }
    if (!ownsLock && this.client.isReady) {
      const waitMs = Math.max(250, Math.min(4000, Number(process.env.REDIS_CACHE_LOCK_WAIT_MS || 2000)));
      const deadline = Date.now() + waitMs;
      while (this.client.isReady && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const filled = await this.getJson<T>(key);
        if (filled !== null) return filled;
      }
    }

    try {
      const value = await loader();
      await this.setJson(key, value, ttlSeconds);
      return value;
    } finally {
      if (ownsLock && this.client.isReady) {
        await this.client.eval(
          "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
          { keys: [this.key(lockKey)], arguments: [token] },
        ).catch(() => undefined);
      }
    }
  }

  async acquireLock(key: string, ttlMs: number): Promise<string | null> {
    if (!this.client.isReady) return null;
    const token = randomUUID();
    const result = await this.client.set(this.key(`lock:${key}`), token, { NX: true, PX: ttlMs }).catch(() => null);
    return result === 'OK' ? token : null;
  }

  async releaseLock(key: string, token: string) {
    if (!this.client.isReady) return;
    await this.client.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      { keys: [this.key(`lock:${key}`)], arguments: [token] },
    ).catch(() => undefined);
  }
}
