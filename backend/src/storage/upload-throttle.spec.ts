/**
 * F0/P4: every route that writes a new object to R2 carries its own upload
 * budget (20 / 10 min per caller), separate from the global 120/window
 * limit. Losing the decorator on any one of these would not fail any other
 * test — the route keeps working, just without a ceiling — which is exactly
 * why each gets its own assertion here (mutation-check: remove one
 * `@Throttle` and this test for that route fails).
 */
import 'reflect-metadata';
import { THROTTLER_LIMIT, THROTTLER_TTL } from '@nestjs/throttler/dist/throttler.constants';
import { HealthObservationsController } from '../health-observations/health-observations.controller';
import { FeedbackController } from '../feedback/feedback.controller';
import { AvatarsController } from '../avatars/avatars.controller';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UPLOAD_THROTTLE } from './r2-storage.service';
import { PhotosController } from './photos.controller';
import { DAILY_UPLOAD_CAP, DailyUploadCapGuard, istDay } from './daily-upload-cap.guard';

const throttleOn = (handler: unknown) => ({
  limit: Reflect.getMetadata(`${THROTTLER_LIMIT}default`, handler as object),
  ttl: Reflect.getMetadata(`${THROTTLER_TTL}default`, handler as object),
});

describe('upload routes are rate limited (P4)', () => {
  const routes: [string, unknown][] = [
    ['POST /health-observations/photos/:pondId', HealthObservationsController.prototype.uploadPhoto],
    ['POST /feedback/attachment', FeedbackController.prototype.uploadAttachment],
    ['POST /profiles/me/avatar', AvatarsController.prototype.upload],
  ];

  it.each(routes)('%s carries the 20/10min upload throttle', (_name, handler) => {
    const { limit, ttl } = throttleOn(handler);
    expect(limit).toBe(UPLOAD_THROTTLE.default.limit);
    expect(ttl).toBe(UPLOAD_THROTTLE.default.ttl);
  });

  it('is separate from (tighter than) the global 120/60s limit', () => {
    // 20 per 10 min ≈ 2/min, well under the global bucket, so it actually bites.
    expect(UPLOAD_THROTTLE.default.limit).toBe(20);
    expect(UPLOAD_THROTTLE.default.ttl).toBe(600_000);
  });
});

describe('P4 daily cap: 100 photo uploads per user per IST day', () => {
  const uploads: [string, unknown][] = [
    ['POST /health-observations/photos/:pondId', HealthObservationsController.prototype.uploadPhoto],
    ['POST /photos/upload/pond/:pondId', PhotosController.prototype.uploadForPond],
    ['POST /photos/upload/farm/:farmId', PhotosController.prototype.uploadForFarm],
    ['POST /feedback/attachment', FeedbackController.prototype.uploadAttachment],
    ['POST /profiles/me/avatar', AvatarsController.prototype.upload],
  ];

  it.each(uploads)('%s carries the daily cap guard', (_name, handler) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler as object)).toContain(DailyUploadCapGuard);
  });

  const ctx = (userId?: string) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user: userId ? { id: userId } : undefined }) }) }) as any;

  it('lets the 100th upload of the day through and refuses the 101st with 429 DAILY_UPLOAD_LIMIT', async () => {
    const counts = new Map<string, number>();
    const redis = {
      incrWithExpiry: jest.fn(async (key: string) => {
        counts.set(key, (counts.get(key) ?? 0) + 1);
        return counts.get(key)!;
      }),
    };
    const guard = new DailyUploadCapGuard(redis as any);
    for (let i = 0; i < DAILY_UPLOAD_CAP; i++) await expect(guard.canActivate(ctx('u1'))).resolves.toBe(true);
    await expect(guard.canActivate(ctx('u1'))).rejects.toMatchObject({
      status: 429,
      response: { code: 'DAILY_UPLOAD_LIMIT' },
    });
    // Another user has their own budget.
    await expect(guard.canActivate(ctx('u2'))).resolves.toBe(true);
    expect(redis.incrWithExpiry.mock.calls[0][0]).toBe(`upl:u1:${istDay()}`);
  });

  it('fails OPEN when Redis is down', async () => {
    const guard = new DailyUploadCapGuard({ incrWithExpiry: jest.fn().mockRejectedValue(new Error('down')) } as any);
    jest.spyOn((guard as any).logger, 'warn').mockImplementation(() => undefined);
    await expect(guard.canActivate(ctx('u1'))).resolves.toBe(true);
  });

  it('the day turns over at IST midnight, not UTC', () => {
    expect(istDay(Date.parse('2026-09-22T18:29:59Z'))).toBe('2026-09-22');
    expect(istDay(Date.parse('2026-09-22T18:30:00Z'))).toBe('2026-09-23');
  });
});
