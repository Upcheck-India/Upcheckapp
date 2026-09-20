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
import { UPLOAD_THROTTLE } from './r2-storage.service';

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
