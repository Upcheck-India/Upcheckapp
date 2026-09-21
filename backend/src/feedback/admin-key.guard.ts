import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

export const ADMIN_KEY_HEADER = 'x-admin-key';

/**
 * name -> sha256 hex of that person's key. Parsed once from ADMIN_STAFF_KEYS
 * (JSON). Anything malformed is treated as "no staff keys configured" (logged),
 * which falls through to the shared-key transition path below rather than
 * refusing every request over one bad env var edit.
 */
function parseStaffKeys(raw: string | undefined, logger: Logger): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    logger.error('ADMIN_STAFF_KEYS is not a JSON object — ignoring it.');
  } catch {
    logger.error('ADMIN_STAFF_KEYS is not valid JSON — ignoring it.');
  }
  return {};
}

const sha256Hex = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/**
 * Per-staff gate for the admin endpoints (feedback, announcements, news,
 * photos, access-log). Each staff member presents their own key
 * (`x-admin-key`); the guard resolves it to a name via ADMIN_STAFF_KEYS and
 * attaches it to the request as `req.adminStaff`, which
 * AdminAccessLogInterceptor uses to write the access-log row. The key alone
 * is no longer the identity — the name it maps to is.
 *
 * There is no staff account model in this app and inventing one to read a
 * support inbox would be a whole authentication feature nobody asked for. The
 * admin dashboard is a server-rendered internal tool: it holds its key
 * server-side and calls this API from route handlers, so no key reaches a
 * browser.
 *
 * Transition, so today's deploy keeps working: if ADMIN_STAFF_KEYS is
 * unset/empty, the old shared ADMIN_API_KEY still works, logged as staff
 * "shared-key", with a startup warning. Once ADMIN_STAFF_KEYS is set, the
 * shared key stops working — a presented key is checked only against the
 * per-staff hashes.
 *
 * Two things this guard must get right regardless of mode:
 *  - Never "no key configured, so skip the check" — a forgotten Render env
 *    var must not turn into a public support inbox containing farmers' photos.
 *  - Compare in constant time. The endpoints are reachable from the internet
 *    and a plain `===` on a secret leaks it a byte at a time to anyone patient.
 *
 * The controllers using this are marked @Public() so the global JwtAuthGuard
 * lets them through — @Public() means "no farmer JWT", not "no auth", and this
 * guard is the auth.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminKeyGuard.name);
  private readonly staffKeys: Record<string, string>;

  constructor(private readonly config: ConfigService) {
    this.staffKeys = parseStaffKeys(this.config.get<string>('ADMIN_STAFF_KEYS'), this.logger);
    if (Object.keys(this.staffKeys).length === 0) {
      this.logger.warn(
        'ADMIN_STAFF_KEYS is not set — admin requests authenticate with the shared ' +
          'ADMIN_API_KEY and are logged as staff "shared-key". Set ADMIN_STAFF_KEYS to ' +
          'attribute access per person (see backend/scripts/make-admin-key.ts).',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = req.headers?.[ADMIN_KEY_HEADER];
    const provided = Array.isArray(header) ? header[0] : header;
    const staffNames = Object.keys(this.staffKeys);

    if (staffNames.length > 0) {
      const name =
        typeof provided === 'string'
          ? staffNames.find((n) => safeEqual(sha256Hex(provided), this.staffKeys[n]))
          : undefined;
      if (!name) {
        this.logger.warn(
          `[ADMIN DENIED] ${req.method} ${req.url} — unknown or missing ${ADMIN_KEY_HEADER}`,
        );
        throw new UnauthorizedException('Invalid admin key');
      }
      req.adminStaff = name;
      return true;
    }

    const expected = this.config.get<string>('ADMIN_API_KEY');
    if (!expected) {
      this.logger.error(
        'Neither ADMIN_STAFF_KEYS nor ADMIN_API_KEY is set — refusing every admin request.',
      );
      throw new UnauthorizedException('Admin API is not configured');
    }
    if (typeof provided !== 'string' || !safeEqual(provided, expected)) {
      this.logger.warn(
        `[ADMIN DENIED] ${req.method} ${req.url} — bad or missing ${ADMIN_KEY_HEADER}`,
      );
      throw new UnauthorizedException('Invalid admin key');
    }
    req.adminStaff = 'shared-key';
    return true;
  }
}

/**
 * Constant-time string compare. `timingSafeEqual` throws on a length mismatch,
 * which would itself leak the key's length, so the lengths are compared first
 * and a mismatch still walks the full comparison against the expected value.
 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // Burn the same work so the failure is not measurably faster.
    timingSafeEqual(bb, bb);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
