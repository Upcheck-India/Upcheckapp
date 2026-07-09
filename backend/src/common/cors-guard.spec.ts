import { assertCorsOriginAllowed } from './cors-guard';

/** CORS-1: refuse to boot in production with a wildcard origin. */
describe('assertCorsOriginAllowed', () => {
  it('throws when production resolves origin to "*"', () => {
    expect(() => assertCorsOriginAllowed('production', '*')).toThrow(
      /CORS_ORIGIN/,
    );
  });

  it('allows an explicit allowlist in production', () => {
    expect(() =>
      assertCorsOriginAllowed('production', 'https://app.upcheck.in'),
    ).not.toThrow();
  });

  it('leaves dev "*" unchanged', () => {
    expect(() => assertCorsOriginAllowed('development', '*')).not.toThrow();
    expect(() => assertCorsOriginAllowed(undefined, '*')).not.toThrow();
  });
});
