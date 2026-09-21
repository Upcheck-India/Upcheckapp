import { EventEmitter } from 'events';
import {
  QueryCounterSubscriber,
  requestTimingMiddleware,
  requestTimingStorage,
  serverTimingValue,
} from './request-timing';
import { tracesSampleRate } from './sentry';

const fakeRes = () => {
  const res: any = new EventEmitter();
  res.headers = {} as Record<string, string>;
  res.headersSent = false;
  res.statusCode = 200;
  res.setHeader = (k: string, v: string) => (res.headers[k] = v);
  res.writeHead = jest.fn();
  return res;
};

describe('request timing', () => {
  it('counts queries made inside the request and reports them in Server-Timing', () => {
    const res = fakeRes();
    const counter = new QueryCounterSubscriber();
    requestTimingMiddleware(10_000)({ method: 'GET', url: '/x' } as any, res, () => {
      counter.afterQuery({ executionTime: 4 } as any);
      counter.afterQuery({ executionTime: 6 } as any);
      requestTimingStorage.getStore()!.cache = 'miss';
    });
    res.writeHead(200);
    expect(res.headers['Server-Timing']).toMatch(
      /^app;dur=[\d.]+, db;dur=10\.0;desc="2 queries", cache;desc=miss$/,
    );
  });

  it('ignores queries outside a request', () => {
    expect(() => new QueryCounterSubscriber().afterQuery({} as any)).not.toThrow();
  });

  it('logs only requests over the threshold', () => {
    const warn = jest
      .spyOn((require('@nestjs/common') as any).Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const fast = fakeRes();
    requestTimingMiddleware(10_000)({ method: 'GET', url: '/a' } as any, fast, () => undefined);
    fast.emit('finish');
    expect(warn).not.toHaveBeenCalled();

    const slow = fakeRes();
    requestTimingMiddleware(0)(
      { method: 'GET', url: '/b?x=1', route: { path: '/api/b/:id' } } as any,
      slow,
      () => undefined,
    );
    slow.emit('finish');
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^GET \/api\/b\/:id 200 \d+ms queries=0 db=0ms$/));
    warn.mockRestore();
  });

  it('formats without a cache verdict', () => {
    expect(serverTimingValue(1, { queries: 0, dbMs: 0 })).toBe('app;dur=1.0, db;dur=0.0;desc="0 queries"');
  });
});

describe('tracesSampleRate', () => {
  it('defaults low and honours a valid override', () => {
    expect(tracesSampleRate(undefined)).toBe(0.05);
    expect(tracesSampleRate('0')).toBe(0);
    expect(tracesSampleRate('0.2')).toBe(0.2);
    expect(tracesSampleRate('7')).toBe(0.05);
    expect(tracesSampleRate('nope')).toBe(0.05);
  });
});
