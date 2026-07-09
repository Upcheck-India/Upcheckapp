import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: Redis | null = null;
  private memoryStore: Map<string, { value: string; expiresAt: number }> =
    new Map();
  private readonly logger = new Logger(RedisService.name);
  private useMemory = false;

  constructor(private configService: ConfigService) {}

  /**
   * True when Redis is unreachable and the service is running on the in-memory
   * fallback — shared 2FA temp-tokens / nonce replay-protection then hold only
   * per-instance (safe on Render's single free instance, degraded if scaled).
   * Surfaced in the health check so ops can see the degraded mode.
   */
  get isMemoryFallback(): boolean {
    return this.useMemory;
  }

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    try {
      this.client = new Redis({
        host: redisHost,
        port: redisPort,
        lazyConnect: true,
        // Keep retrying indefinitely (capped backoff) instead of giving up after
        // 3 tries — a transient outage should self-heal once Redis comes back
        // rather than pinning the process on the in-memory fallback forever.
        retryStrategy: (times) => {
          if (times > 3) {
            this.enableMemoryFallback(
              'Redis connection failed, switching to in-memory store.',
            );
          }
          return Math.min(times * 50, 5000);
        },
      });

      this.client.on('error', (err) => {
        this.logger.warn(`Redis client error: ${err.message}`);
      });
      this.client.on('ready', () => this.handleReconnect());

      await this.client.connect().catch(() => {
        this.enableMemoryFallback(
          'Initial Redis connection failed, using in-memory store.',
        );
      });
    } catch (e) {
      this.enableMemoryFallback(
        'Redis client initialization failed, utilizing in-memory store.',
      );
    }
  }

  /**
   * Switch to the in-memory store and, in production, warn loudly (INFRA-1):
   * the memory store is per-process, so 2FA temp tokens and Truecaller nonce
   * replay protection are scoped to a single instance. Safe on one instance;
   * BROKEN if the service is scaled horizontally (tokens/nonces minted on one
   * instance won't be seen by another).
   */
  private enableMemoryFallback(reason: string): void {
    if (this.useMemory) return; // warn once
    this.useMemory = true;
    this.logger.warn(reason);
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn(
        'Redis unavailable in PRODUCTION — using per-instance in-memory store. ' +
          '2FA temp tokens and Truecaller nonce replay protection are now per-instance: ' +
          'safe on a single instance, BROKEN if scaled to multiple instances. ' +
          'Provision Redis before scaling horizontally.',
      );
    }
  }

  /** Redis reconnected ('ready' event) — stop serving from the memory fallback. */
  private handleReconnect(): void {
    if (this.useMemory) {
      this.useMemory = false;
      this.logger.log('Redis reconnected — leaving in-memory fallback.');
    }
  }

  async set(
    key: string,
    value: string,
    mode?: 'EX',
    duration?: number,
  ): Promise<void> {
    if (this.useMemory || !this.client) {
      const expiresAt = duration ? Date.now() + duration * 1000 : Infinity;
      this.memoryStore.set(key, { value, expiresAt });
      return;
    }
    if (mode === 'EX' && duration) {
      await this.client.set(key, value, 'EX', duration);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.useMemory || !this.client) {
      const item = this.memoryStore.get(key);
      if (!item) return null;
      if (item.expiresAt < Date.now()) {
        this.memoryStore.delete(key);
        return null;
      }
      return item.value;
    }
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    if (this.useMemory || !this.client) {
      this.memoryStore.delete(key);
      return;
    }
    await this.client.del(key);
  }
}
