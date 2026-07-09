/**
 * CORS-1: refuse to boot in production with a wildcard CORS origin.
 *
 * `main.ts` defaults CORS_ORIGIN to `*` for dev convenience. In production that
 * silently allows every origin (and forces credentials off). Fail loudly at
 * startup instead so the misconfiguration is impossible to miss. Dev/test keep
 * the permissive `*` default unchanged.
 */
export function assertCorsOriginAllowed(
  nodeEnv: string | undefined,
  corsOrigin: string,
): void {
  if (nodeEnv === 'production' && corsOrigin === '*') {
    throw new Error(
      'CORS_ORIGIN must be an explicit allowlist in production (got "*"). ' +
        'Set CORS_ORIGIN to a comma-separated list of allowed origins.',
    );
  }
}
