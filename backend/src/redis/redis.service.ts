import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit {
    private client: Redis | null = null;
    private memoryStore: Map<string, { value: string, expiresAt: number }> = new Map();
    private readonly logger = new Logger(RedisService.name);
    private useMemory = false;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

        try {
            this.client = new Redis({
                host: redisHost,
                port: redisPort,
                lazyConnect: true,
                retryStrategy: (times) => {
                    if (times > 3) {
                        this.logger.warn('Redis connection failed, switching to in-memory store.');
                        this.useMemory = true;
                        return null; // Stop retrying
                    }
                    return Math.min(times * 50, 2000);
                }
            });

            await this.client.connect().catch(() => {
                this.logger.warn('Initial Redis connection failed, using in-memory store.');
                this.useMemory = true;
            });

        } catch (e) {
            this.logger.warn('Redis client initialization failed, utilizing in-memory store.', e);
            this.useMemory = true;
        }
    }

    async set(key: string, value: string, mode?: 'EX', duration?: number): Promise<void> {
        if (this.useMemory || !this.client) {
            const expiresAt = duration ? Date.now() + (duration * 1000) : Infinity;
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
