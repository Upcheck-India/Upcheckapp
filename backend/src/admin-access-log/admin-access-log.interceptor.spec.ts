import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AdminAccessLogInterceptor } from './admin-access-log.interceptor';
import { AdminAccessLogService } from './admin-access-log.service';

const contextFor = (req: any, res: any = { statusCode: 200 }): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => function handler() {},
  }) as unknown as ExecutionContext;

const handlerReturning = (value: unknown): CallHandler => ({
  handle: () => of(value),
});

/** Reflector that returns `meta` for any handler, like `.get()` after `@AdminSubject()`. */
const reflectorReturning = (meta: unknown) => ({ get: () => meta }) as unknown as Reflector;

describe('AdminAccessLogInterceptor', () => {
  it('falls back to the legacy route-prefix table for an un-annotated route (feedback)', (done) => {
    const log = jest.fn().mockResolvedValue(undefined);
    const interceptor = new AdminAccessLogInterceptor(
      { log } as unknown as AdminAccessLogService,
      reflectorReturning(undefined),
    );
    const req = {
      adminStaff: 'robin',
      method: 'PATCH',
      originalUrl: '/api/admin/feedback/abc-123?x=1',
      params: { id: 'abc-123' },
      ip: '203.0.113.9',
    };

    interceptor.intercept(contextFor(req, { statusCode: 200 }), handlerReturning({ ok: true })).subscribe({
      next: () => {
        expect(log).toHaveBeenCalledWith({
          staffName: 'robin',
          method: 'PATCH',
          route: '/api/admin/feedback/abc-123',
          subjectType: 'feedback_id',
          subjectId: 'abc-123',
          ip: '203.0.113.9',
          status: 200,
        });
        done();
      },
    });
  });

  it('uses @AdminSubject() metadata when present, over the legacy table', (done) => {
    const log = jest.fn().mockResolvedValue(undefined);
    const interceptor = new AdminAccessLogInterceptor(
      { log } as unknown as AdminAccessLogService,
      reflectorReturning({ type: 'farm_id', param: 'farmId' }),
    );
    const req = {
      adminStaff: 'robin',
      method: 'GET',
      originalUrl: '/api/admin/farms/f-9',
      params: { farmId: 'f-9' },
      ip: null,
    };

    interceptor.intercept(contextFor(req), handlerReturning({ ok: true })).subscribe({
      next: () => {
        expect(log).toHaveBeenCalledWith(
          expect.objectContaining({ subjectType: 'farm_id', subjectId: 'f-9' }),
        );
        done();
      },
    });
  });

  it('prefers an explicit req.adminSubject over both @AdminSubject() and the legacy table', (done) => {
    const log = jest.fn().mockResolvedValue(undefined);
    const interceptor = new AdminAccessLogInterceptor(
      { log } as unknown as AdminAccessLogService,
      reflectorReturning({ type: 'farm_id', param: 'farmId' }),
    );
    const req = {
      adminStaff: 'robin',
      method: 'POST',
      originalUrl: '/api/admin/photos/some-op',
      params: {},
      adminSubject: { type: 'photo_path', id: 'health/u1/p1.jpg' },
    };

    interceptor.intercept(contextFor(req), handlerReturning({ ok: true })).subscribe({
      next: () => {
        expect(log).toHaveBeenCalledWith(
          expect.objectContaining({ subjectType: 'photo_path', subjectId: 'health/u1/p1.jpg' }),
        );
        done();
      },
    });
  });

  it('logs a null subject for a route with no id and no annotation (e.g. the photo drain sweep)', (done) => {
    const log = jest.fn().mockResolvedValue(undefined);
    const interceptor = new AdminAccessLogInterceptor(
      { log } as unknown as AdminAccessLogService,
      reflectorReturning(undefined),
    );
    const req = {
      adminStaff: 'robin',
      method: 'POST',
      originalUrl: '/api/admin/photos/drain',
      params: {},
    };

    interceptor.intercept(contextFor(req), handlerReturning({ deleted: 0 })).subscribe({
      next: () => {
        expect(log).toHaveBeenCalledWith(
          expect.objectContaining({ subjectType: null, subjectId: null }),
        );
        done();
      },
    });
  });

  /**
   * The one the test gate names explicitly: a missing identity means the
   * guard never ran (or this isn't an admin route) — nothing to log.
   * Mutation-check: delete the `if (!staffName) return next.handle()` guard
   * and every request in the app starts writing rows with staffName
   * `undefined`.
   */
  it('does nothing when req.adminStaff is not set', (done) => {
    const log = jest.fn();
    const interceptor = new AdminAccessLogInterceptor(
      { log } as unknown as AdminAccessLogService,
      reflectorReturning(undefined),
    );
    const req = { method: 'GET', originalUrl: '/api/health', params: {} };

    interceptor.intercept(contextFor(req), handlerReturning({ ok: true })).subscribe({
      next: () => {
        expect(log).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('never fails the admin request when the logging write itself rejects', (done) => {
    const log = jest.fn().mockRejectedValue(new Error('db down'));
    const interceptor = new AdminAccessLogInterceptor(
      { log } as unknown as AdminAccessLogService,
      reflectorReturning(undefined),
    );
    const req = { adminStaff: 'robin', method: 'GET', originalUrl: '/api/admin/feedback', params: {} };

    interceptor.intercept(contextFor(req), handlerReturning({ reports: [] })).subscribe({
      next: (value) => {
        expect(value).toEqual({ reports: [] });
        done();
      },
      error: done,
    });
  });

  it('passes through an error response unlogged (only successes are logged, per C5.1)', (done) => {
    const log = jest.fn();
    const interceptor = new AdminAccessLogInterceptor(
      { log } as unknown as AdminAccessLogService,
      reflectorReturning(undefined),
    );
    const req = { adminStaff: 'robin', method: 'GET', originalUrl: '/api/admin/feedback', params: {} };
    const failingHandler: CallHandler = { handle: () => throwError(() => new Error('boom')) };

    interceptor.intercept(contextFor(req), failingHandler).subscribe({
      error: () => {
        expect(log).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
