import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

/**
 * Redis storage for rate limiting.
 * Falls back to in-memory Map if Redis is unavailable.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private redis: Redis | null = null;
  private memory = new Map<string, { totalHits: number; expiresAt: number }>();
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn('REDIS_URL не задан — rate limit в памяти процесса');
      return;
    }
    try {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      this.redis.connect().catch(() => {
        this.logger.warn('Redis недоступен — fallback на память');
        this.redis = null;
      });
    } catch {
      this.logger.warn('Не удалось инициализировать Redis');
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    if (this.redis) {
      try {
        const redisKey = `throttle:${key}`;
        const totalHits = await this.redis.incr(redisKey);
        if (totalHits === 1) await this.redis.pexpire(redisKey, ttl);
        const pttl = await this.redis.pttl(redisKey);
        return {
          totalHits,
          timeToExpire: Math.max(pttl, 0),
          isBlocked: false,
          timeToBlockExpire: 0,
        };
      } catch {
        // fall through to memory
      }
    }

    const now = Date.now();
    const current = this.memory.get(key);
    if (!current || current.expiresAt <= now) {
      this.memory.set(key, { totalHits: 1, expiresAt: now + ttl });
      return { totalHits: 1, timeToExpire: ttl, isBlocked: false, timeToBlockExpire: 0 };
    }
    current.totalHits += 1;
    return {
      totalHits: current.totalHits,
      timeToExpire: Math.max(current.expiresAt - now, 0),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
