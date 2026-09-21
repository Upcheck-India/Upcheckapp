import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AdminAccessLogService } from './admin-access-log.service';
import { ADMIN_SUBJECT_KEY } from './admin-subject.decorator';

/**
 * Fallback for admin controllers that predate `@AdminSubject()`
 * (feedback, announcements) — matched by substring against the route
 * (which carries the global `/api` prefix, e.g. `/api/admin/feedback/:id`)
 * so a param named `id` still gets a meaningful subject_type. New admin
 * controllers should use `@AdminSubject()` instead of extending this table.
 */
const LEGACY_SUBJECT_TYPE_BY_PREFIX: Record<string, string> = {
  '/admin/feedback': 'feedback_id',
  '/admin/announcements': 'announcement_id',
};

/**
 * Global interceptor (registered once, as APP_INTERCEPTOR in
 * AdminAccessLogModule) that writes an admin_access_log row on every
 * successful admin request — current and future, since it activates purely
 * off `req.adminStaff` rather than anything a controller opts into.
 *
 * AdminKeyGuard runs before any interceptor and attaches `req.adminStaff` on
 * success; a guard failure throws before this ever runs, so only successful
 * reads/writes reach here, which is what C5.1 asks for. Cheap on every other
 * route in the app: bails immediately when `req.adminStaff` is unset, so no
 * admin controller needs its own `@UseInterceptors()`.
 *
 * Subject naming (subject_type/subject_id) — see admin-subject.decorator.ts
 * for the two ways a controller can name its subject; this interceptor
 * checks, in order: `req.adminSubject`, then `@AdminSubject()` metadata, then
 * the legacy prefix table above, then null.
 */
@Injectable()
export class AdminAccessLogInterceptor implements NestInterceptor {
  constructor(
    private readonly accessLog: AdminAccessLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const staffName: string | undefined = req.adminStaff;
    if (!staffName) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const res = http.getResponse();
        const route: string = (req.originalUrl ?? req.url ?? '').split('?')[0];
        const subject = this.resolveSubject(context, req, route);
        void this.accessLog
          .log({
            staffName,
            method: req.method,
            route,
            subjectType: subject?.type ?? null,
            subjectId: subject?.id ?? null,
            ip: req.ip ?? null,
            status: res?.statusCode ?? 200,
          })
          .catch(() => {
            // AdminAccessLogService.log() already never throws — this is
            // defense-in-depth so a future change there can't take an admin
            // request down with it.
          });
      }),
    );
  }

  private resolveSubject(
    context: ExecutionContext,
    req: any,
    route: string,
  ): { type: string; id: string | null } | null {
    if (req.adminSubject?.type) {
      return { type: req.adminSubject.type, id: req.adminSubject.id ?? null };
    }

    const meta = this.reflector.get<{ type: string; param: string } | undefined>(
      ADMIN_SUBJECT_KEY,
      context.getHandler(),
    );
    if (meta) {
      return { type: meta.type, id: req.params?.[meta.param] ?? null };
    }

    const prefix = Object.keys(LEGACY_SUBJECT_TYPE_BY_PREFIX).find((p) => route.includes(p));
    if (prefix) {
      return { type: LEGACY_SUBJECT_TYPE_BY_PREFIX[prefix], id: req.params?.id ?? null };
    }

    return null;
  }
}
