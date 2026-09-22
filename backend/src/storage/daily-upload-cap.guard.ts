import { CanActivate, ExecutionContext, HttpException, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { withTimeout } from '../common/response-cache';
import { photoError } from './r2-storage.service';

/** P4 (second half): photo uploads per user per IST calendar day, all upload routes together. */
export const DAILY_UPLOAD_CAP = 100;

const IST_OFFSET_MS = 5.5 * 3_600_000;

/** The IST calendar day `YYYY-MM-DD` that `now` falls on. */
export const istDay = (now = Date.now()) => new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);

/**
 * Counts every attempt on an upload route (before the body is parsed) in
 * Redis under `upl:<user>:<IST day>`; the 101st of the day is a 429
 * DAILY_UPLOAD_LIMIT. FAIL-OPEN like the response cache: a Redis error or
 * timeout lets the upload through (the 20/10 min throttle still applies).
 */
@Injectable()
export class DailyUploadCapGuard implements CanActivate {
  private readonly logger = new Logger(DailyUploadCapGuard.name);

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId: string | undefined = context.switchToHttp().getRequest().user?.id;
    if (!userId) return true;
    let n: number;
    try {
      n = await withTimeout(this.redis.incrWithExpiry(`upl:${userId}:${istDay()}`, 2 * 86_400));
    } catch (err: any) {
      this.logger.warn(`daily upload cap skipped: ${err?.message ?? err}`);
      return true;
    }
    if (n > DAILY_UPLOAD_CAP) {
      throw new HttpException(
        photoError(429, 'DAILY_UPLOAD_LIMIT', `Daily limit of ${DAILY_UPLOAD_CAP} photo uploads reached`),
        429,
      );
    }
    return true;
  }
}
