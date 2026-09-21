import { AsyncLocalStorage } from 'async_hooks';
import { Logger } from '@nestjs/common';
import type { EntitySubscriberInterface, AfterQueryEvent } from 'typeorm';
import type { NextFunction, Request, Response } from 'express';

/**
 * Per-request timing: wall time, SQL statement count, summed SQL time and the
 * response-cache verdict, exposed as a `Server-Timing` header on every
 * response and logged for anything slower than SLOW_REQUEST_LOG_MS.
 *
 * Exists because "the app is slow" had no numbers behind it — no tracing, no
 * request log. `Server-Timing` is readable from the client (and curl -v), and
 * the slow log lands in Render's log stream with nothing else to set up.
 */
export interface RequestTimingStore {
  queries: number;
  /** Summed statement time; parallel statements overlap, so it can exceed wall time. */
  dbMs: number;
  /** 'hit' | 'miss' | 'bypass' when a response-cached route ran. */
  cache?: string;
}

export const requestTimingStorage = new AsyncLocalStorage<RequestTimingStore>();

/** Default slow-log threshold; `SLOW_REQUEST_LOG_MS` overrides. */
const DEFAULT_SLOW_MS = 300;

const logger = new Logger('RequestTiming');

/** The route pattern (ids stripped) when Nest resolved one, else the path. */
const routeOf = (req: Request): string =>
  (req.route?.path as string | undefined) ??
  (req.originalUrl ?? req.url ?? '').split('?')[0];

export const serverTimingValue = (ms: number, s: RequestTimingStore): string =>
  [
    `app;dur=${ms.toFixed(1)}`,
    `db;dur=${s.dbMs.toFixed(1)};desc="${s.queries} queries"`,
    ...(s.cache ? [`cache;desc=${s.cache}`] : []),
  ].join(', ');

export function requestTimingMiddleware(
  slowMs = Number(process.env.SLOW_REQUEST_LOG_MS) || DEFAULT_SLOW_MS,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    const store: RequestTimingStore = { queries: 0, dbMs: 0 };
    const elapsed = () => Number(process.hrtime.bigint() - start) / 1e6;

    // Headers must be set before they are flushed, so hook writeHead rather
    // than 'finish'.
    const writeHead = res.writeHead;
    res.writeHead = function (this: Response, ...args: any[]) {
      if (!res.headersSent) res.setHeader('Server-Timing', serverTimingValue(elapsed(), store));
      return (writeHead as any).apply(this, args);
    } as any;

    res.on('finish', () => {
      const ms = elapsed();
      if (ms < slowMs) return;
      logger.warn(
        `${req.method} ${routeOf(req)} ${res.statusCode} ${Math.round(ms)}ms ` +
          `queries=${store.queries} db=${Math.round(store.dbMs)}ms` +
          (store.cache ? ` cache=${store.cache}` : ''),
      );
    });

    requestTimingStorage.run(store, () => next());
  };
}

/**
 * Counts every SQL statement against the current request. Registered on the
 * DataSource in main.ts; TypeORM broadcasts query events to every subscriber.
 */
export class QueryCounterSubscriber implements EntitySubscriberInterface {
  afterQuery(event: AfterQueryEvent<unknown>): void {
    const s = requestTimingStorage.getStore();
    if (!s) return;
    s.queries += 1;
    s.dbMs += event.executionTime ?? 0;
  }
}
