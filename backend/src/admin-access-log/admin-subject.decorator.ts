import { SetMetadata } from '@nestjs/common';

export const ADMIN_SUBJECT_KEY = 'adminSubjectType';

/**
 * Names what a route identifies, for admin_access_log's
 * subject_type/subject_id columns. AdminAccessLogInterceptor reads this via
 * Reflector — no admin controller needs to import the interceptor itself.
 *
 * `@AdminSubject('user_id')` reads `req.params.id` (the common case: a
 * `GET/PATCH /admin/whatever/:id` route).
 * `@AdminSubject('farm_id', 'farmId')` reads `req.params.farmId` instead, for
 * a route whose param isn't named `id`.
 *
 * A route with no natural subject (a list, a sweep like `POST
 * /admin/photos/drain`) needs neither this decorator nor `req.adminSubject`
 * — both columns staying null is correct, not a gap.
 *
 * For a subject the router can't see in a named param — derived from the
 * body, or a photo path containing slashes — set `req.adminSubject = {
 * type, id }` directly in the handler instead; the interceptor prefers that
 * over this decorator when both are present.
 *
 * Existing admin controllers (feedback, announcements) aren't annotated with
 * this yet — the interceptor falls back to a hardcoded route-prefix table
 * for those so they still log a reasonable subject_type. New admin
 * controllers should use this decorator instead of extending that table.
 */
export const AdminSubject = (type: string, param = 'id') =>
  SetMetadata(ADMIN_SUBJECT_KEY, { type, param });
