import {
  applyDecorators,
  CallHandler,
  ExecutionContext,
  Global,
  Injectable,
  Logger,
  Module,
  NestInterceptor,
  SetMetadata,
  UseInterceptors,
} from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { from, Observable, of } from 'rxjs';
import { concatMap, switchMap } from 'rxjs/operators';
import { RedisService } from '../redis/redis.service';
import { requestTimingStorage } from './request-timing';

/**
 * Short-lived, per-user Redis cache for the expensive aggregate GETs (Today,
 * alert center, daily brief, pond contexts, farm/pond lists).
 *
 * ISOLATION — every entry lives in the CALLER's own hash (`rc:u:<userId>`),
 * keyed by the full request URL. Nothing is ever shared between users, so one
 * person's role, capabilities or pond scope can never leak into another's
 * view. The roles and scopes are baked into what each user's own handler
 * computed.
 *
 * INVALIDATION — any successful write (POST/PUT/PATCH/DELETE) by user U drops
 * the whole hash of U and of every user who shares a farm with U, looked up
 * BEFORE the write runs (so a member being removed is still on the list) and
 * awaited BEFORE the response is sent (so the client's post-write refetch can
 * never read the pre-write copy). Writes that do not come through HTTP (cron
 * alerts, scheduled tasks) are covered only by the TTL.
 *
 * FAIL-OPEN — every Redis call is bounded by REDIS_TIMEOUT_MS and any error
 * just means "no cache": the handler runs as if this did not exist.
 *
 * ponytail: a read that started before a write and finishes after its
 * invalidation can re-store the pre-write body for up to one TTL. TTLs are
 * 30–120 s for that reason; add a per-user generation counter if that window
 * ever matters.
 */
const CACHE_TTL = 'response-cache:ttl';
const REDIS_TIMEOUT_MS = 250;
/** One oversized body must not crowd Upstash; such a response is just not cached. */
const MAX_BODY_BYTES = 512 * 1024;

export const userCacheKey = (userId: string) => `rc:u:${userId}`;

export const withTimeout = <T>(p: Promise<T>, ms = REDIS_TIMEOUT_MS): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) => {
      const t = setTimeout(() => reject(new Error('redis timeout')), ms);
      t.unref?.();
    }),
  ]);

const mark = (verdict: string) => {
  const s = requestTimingStorage.getStore();
  if (s) s.cache = verdict;
};

@Injectable()
export class ResponseCacheService {
  private readonly logger = new Logger(ResponseCacheService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  async read(userId: string, field: string): Promise<unknown | undefined> {
    try {
      const raw = await withTimeout(this.redis.hget(userCacheKey(userId), field));
      if (!raw) return undefined;
      const { exp, body } = JSON.parse(raw) as { exp: number; body: unknown };
      return exp > Date.now() ? body : undefined;
    } catch {
      return undefined;
    }
  }

  async write(userId: string, field: string, body: unknown, ttlSeconds: number): Promise<void> {
    try {
      const raw = JSON.stringify({ exp: Date.now() + ttlSeconds * 1000, body });
      if (raw.length > MAX_BODY_BYTES) return;
      await withTimeout(this.redis.hsetWithExpiry(userCacheKey(userId), field, raw, ttlSeconds));
    } catch (err: any) {
      this.logger.warn(`response cache write skipped: ${err?.message ?? err}`);
    }
  }

  /** U plus everyone on any farm U belongs to or owns (any member status). */
  async usersSharingFarmsWith(userId: string): Promise<string[]> {
    try {
      const rows: { id: string }[] = await this.dataSource.query(
        `WITH f AS (
           SELECT farm_id AS id FROM farm_members WHERE user_id = $1
           UNION SELECT id FROM farms WHERE user_id = $1
         )
         SELECT user_id::text AS id FROM farm_members WHERE farm_id IN (SELECT id FROM f)
         UNION SELECT user_id::text FROM farms WHERE id IN (SELECT id FROM f)`,
        [userId],
      );
      return [...new Set([userId, ...rows.map((r) => r.id)])];
    } catch (err: any) {
      this.logger.warn(`response cache: co-member lookup failed (${err?.message ?? err}); invalidating the writer only`);
      return [userId];
    }
  }

  async invalidate(userIds: string[]): Promise<void> {
    try {
      await withTimeout(this.redis.delMany(userIds.map(userCacheKey)));
    } catch (err: any) {
      // The TTL still bounds how stale anyone can read.
      this.logger.warn(`response cache invalidation failed: ${err?.message ?? err}`);
    }
  }
}

/** Serve this GET from the caller's cache for `ttlSeconds` (30–120). */
export const CachedRead = (ttlSeconds: number) =>
  applyDecorators(
    SetMetadata(CACHE_TTL, ttlSeconds),
    UseInterceptors(ResponseCacheInterceptor),
  );

@Injectable()
export class ResponseCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cache: ResponseCacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const ttl = this.reflector.get<number>(CACHE_TTL, context.getHandler());
    const userId: string | undefined = req.user?.id;
    if (!ttl || !userId || req.method !== 'GET') {
      mark('bypass');
      return next.handle();
    }
    const field: string = req.originalUrl ?? req.url;
    return from(this.cache.read(userId, field)).pipe(
      switchMap((hit) => {
        if (hit !== undefined) {
          mark('hit');
          return of(hit);
        }
        mark('miss');
        return next.handle().pipe(
          concatMap(async (body) => {
            await this.cache.write(userId, field, body, ttl);
            return body;
          }),
        );
      }),
    );
  }
}

/** Global: every successful write drops the affected users' caches. */
@Injectable()
export class ResponseCacheInvalidationInterceptor implements NestInterceptor {
  constructor(private readonly cache: ResponseCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    if (!userId || req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next.handle();
    }
    return from(this.cache.usersSharingFarmsWith(userId)).pipe(
      switchMap((users) =>
        next.handle().pipe(
          concatMap(async (body) => {
            await this.cache.invalidate(users);
            return body;
          }),
        ),
      ),
    );
  }
}

@Global()
@Module({
  providers: [
    ResponseCacheService,
    ResponseCacheInterceptor,
    { provide: APP_INTERCEPTOR, useClass: ResponseCacheInvalidationInterceptor },
  ],
  exports: [ResponseCacheService, ResponseCacheInterceptor],
})
export class ResponseCacheModule {}
