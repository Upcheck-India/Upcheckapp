import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { SupabaseAuthService } from './supabase-auth.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email.service';
import type { AccountCodePurpose } from './dto/account.dto';

export const CODE_TTL_SECONDS = 600;
export const CODE_MAX_ATTEMPTS = 5;
export const CODE_COOLDOWN_SECONDS = 60;

const INTERNAL_EMAIL = /@truecaller\.temp$/i;
/** Server-only (app_metadata) marker of whether the user KNOWS a password. */
const PASSWORD_SET_FLAG = 'upcheck_password_set';

/** 4xx with a stable machine code the app translates. */
const fail = (status: number, code: string, message: string) =>
  new HttpException({ statusCode: status, code, message }, status);

const sha256 = (s: string) =>
  crypto.createHash('sha256').update(s).digest('hex');

interface AuthFacts {
  email: string | null;
  appMeta: Record<string, any>;
  hasEncryptedPassword: boolean;
}

export interface AccountInfo {
  createdAt: string | null;
  phone: string | null;
  phoneVerified: boolean;
  hasPassword: boolean;
  providers: string[];
  emailIsInternal: boolean;
}

/**
 * Self-service account management: name, email, password, linked sign-in
 * methods. Every identity fact is read fresh from Supabase Auth, never from
 * the caller's JWT (whose email claim is stale after a change).
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly authService: SupabaseAuthService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
  ) {}

  private get admin() {
    return this.authService.getClient().auth.admin;
  }

  // ─────────────────────────── facts ───────────────────────────

  /**
   * Email, app_metadata and whether a password hash exists. Reads auth.users
   * directly (the backend connects as the project's postgres role); if that
   * schema is not readable, falls back to the admin API, where an `email`
   * identity stands in for "has a password hash".
   */
  private async authFacts(userId: string): Promise<AuthFacts> {
    try {
      const rows: any[] = await this.dataSource.query(
        `SELECT email,
                raw_app_meta_data AS app_meta,
                (encrypted_password IS NOT NULL AND encrypted_password <> '') AS has_pw
           FROM auth.users WHERE id = $1`,
        [userId],
      );
      if (rows[0]) {
        return {
          email: rows[0].email ?? null,
          appMeta: rows[0].app_meta ?? {},
          hasEncryptedPassword: !!rows[0].has_pw,
        };
      }
    } catch (err: any) {
      this.logger.warn(
        `auth.users not readable, using admin API: ${err?.message}`,
      );
    }
    const { data, error } = await this.admin.getUserById(userId);
    if (error || !data?.user) {
      throw new ServiceUnavailableException(
        'Could not reach the authentication service',
      );
    }
    const identities = (data.user.identities ?? []) as { provider?: string }[];
    return {
      email: data.user.email ?? null,
      appMeta: data.user.app_metadata ?? {},
      hasEncryptedPassword: identities.some((i) => i.provider === 'email'),
    };
  }

  /**
   * Whether the user knows a password. A Truecaller account HAS a hash — a
   * random UUID set at creation that nobody knows — so the hash alone is not
   * the answer for internal-email accounts or ones that left that state.
   */
  static hasPassword(facts: AuthFacts): boolean {
    const flag = facts.appMeta?.[PASSWORD_SET_FLAG];
    if (flag === true) return true;
    if (flag === false) return false;
    if (facts.email && INTERNAL_EMAIL.test(facts.email)) return false;
    return facts.hasEncryptedPassword;
  }

  private static providers(facts: AuthFacts): string[] {
    const list = facts.appMeta?.providers;
    if (Array.isArray(list)) return list.filter((p) => typeof p === 'string');
    return facts.appMeta?.provider ? [facts.appMeta.provider] : [];
  }

  async getAccountInfo(userId: string): Promise<AccountInfo> {
    const [facts, rows] = await Promise.all([
      this.authFacts(userId),
      this.dataSource.query(
        `SELECT created_at, phone, phone_verified FROM users WHERE id = $1`,
        [userId],
      ) as Promise<any[]>,
    ]);
    const row = rows[0] ?? {};
    return {
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      phone: row.phone ?? null,
      phoneVerified: !!row.phone_verified,
      hasPassword: AccountService.hasPassword(facts),
      providers: AccountService.providers(facts),
      emailIsInternal: !!facts.email && INTERNAL_EMAIL.test(facts.email),
    };
  }

  // ─────────────────────────── name ───────────────────────────

  /** One name, written everywhere a reader might look for it. */
  async updateName(userId: string, fullName: string): Promise<void> {
    const full = fullName.trim();
    const [first, ...rest] = full.split(/\s+/);
    const last = rest.join(' ');

    const { error } = await this.admin.updateUserById(userId, {
      user_metadata: {
        full_name: full,
        first_name: first,
        last_name: last,
        firstName: first,
        lastName: last,
      },
    });
    if (error) throw new ServiceUnavailableException(error.message);

    await this.dataSource.query(
      `UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3`,
      [first, last, userId],
    );
    await this.dataSource.query(
      `UPDATE profiles SET full_name = $1 WHERE id = $2`,
      [full, userId],
    );
  }

  // ─────────────────────────── email codes ───────────────────────────

  private codeKey(userId: string, purpose: AccountCodePurpose, email: string) {
    return `account:code:${purpose}:${userId}:${email.toLowerCase()}`;
  }

  private async assertEmailFree(userId: string, email: string) {
    const rows: any[] = await this.dataSource.query(
      `SELECT id FROM users WHERE lower(email) = $1 AND id <> $2 LIMIT 1`,
      [email.toLowerCase(), userId],
    );
    if (rows.length) {
      throw fail(409, 'EMAIL_TAKEN', 'That email belongs to another account.');
    }
  }

  private static isGoogle(facts: AuthFacts) {
    return AccountService.providers(facts).includes('google');
  }

  /** Where a code for this purpose goes — validating the request on the way. */
  private async codeTarget(
    userId: string,
    facts: AuthFacts,
    purpose: AccountCodePurpose,
    newEmail?: string,
  ): Promise<string> {
    if (purpose === 'set_password') {
      if (AccountService.hasPassword(facts)) {
        throw fail(409, 'PASSWORD_ALREADY_SET', 'This account has a password.');
      }
      if (!facts.email || INTERNAL_EMAIL.test(facts.email)) {
        throw fail(400, 'NO_REAL_EMAIL', 'Add an email address first.');
      }
      return facts.email.toLowerCase();
    }
    const to = (newEmail ?? '').trim().toLowerCase();
    if (!to || INTERNAL_EMAIL.test(to)) {
      throw fail(400, 'EMAIL_INVALID', 'Enter a valid email address.');
    }
    if (AccountService.isGoogle(facts)) {
      throw fail(
        400,
        'GOOGLE_EMAIL_LOCKED',
        'Google accounts keep their Google email.',
      );
    }
    if (facts.email && facts.email.toLowerCase() === to) {
      throw fail(400, 'EMAIL_UNCHANGED', 'That is already your email.');
    }
    await this.assertEmailFree(userId, to);
    return to;
  }

  async requestEmailCode(
    userId: string,
    purpose: AccountCodePurpose,
    newEmail?: string,
  ) {
    const facts = await this.authFacts(userId);
    const to = await this.codeTarget(userId, facts, purpose, newEmail);

    // One send per minute per (user, purpose), whatever the address.
    const cooldownKey = `account:code:cooldown:${purpose}:${userId}`;
    if (await this.redis.get(cooldownKey)) {
      throw fail(
        HttpStatus.TOO_MANY_REQUESTS,
        'CODE_COOLDOWN',
        'Wait a minute before asking for another code.',
      );
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const key = this.codeKey(userId, purpose, to);
    await this.redis.set(
      key,
      JSON.stringify({
        hash: sha256(code),
        attempts: 0,
        exp: Date.now() + CODE_TTL_SECONDS * 1000,
      }),
      'EX',
      CODE_TTL_SECONDS,
    );
    await this.redis.set(cooldownKey, '1', 'EX', CODE_COOLDOWN_SECONDS);

    try {
      await this.emailService.sendAccountCodeEmail(to, code, purpose);
    } catch {
      await this.redis.del(key);
      await this.redis.del(cooldownKey);
      throw fail(503, 'EMAIL_SEND_FAILED', 'Could not send the code.');
    }
    return {
      sent: true,
      expiresInSeconds: CODE_TTL_SECONDS,
      cooldownSeconds: CODE_COOLDOWN_SECONDS,
    };
  }

  /** Consume a code. Wrong guesses count; the 5th wrong one burns it. */
  async verifyCode(
    userId: string,
    purpose: AccountCodePurpose,
    email: string,
    code: string,
  ): Promise<void> {
    const key = this.codeKey(userId, purpose, email);
    const raw = await this.redis.get(key);
    if (!raw) throw fail(400, 'CODE_EXPIRED', 'The code has expired.');
    const entry = JSON.parse(raw) as {
      hash: string;
      attempts: number;
      exp: number;
    };

    const ok = crypto.timingSafeEqual(
      Buffer.from(sha256(String(code))),
      Buffer.from(entry.hash),
    );
    if (ok) {
      await this.redis.del(key);
      return;
    }

    // ponytail: read-modify-write, so parallel guesses can overshoot the cap
    // by a few; the route's 5/min throttle bounds that. Redis INCR if it matters.
    const attempts = entry.attempts + 1;
    const ttl = Math.ceil((entry.exp - Date.now()) / 1000);
    if (attempts >= CODE_MAX_ATTEMPTS || ttl <= 0) {
      await this.redis.del(key);
      throw fail(400, 'TOO_MANY_ATTEMPTS', 'Too many wrong codes. Ask again.');
    }
    await this.redis.set(key, JSON.stringify({ ...entry, attempts }), 'EX', ttl);
    throw fail(400, 'CODE_INVALID', 'That code is not right.');
  }

  // ─────────────────────────── password / email ───────────────────────────

  async setPassword(userId: string, code: string, newPassword: string) {
    const facts = await this.authFacts(userId);
    const to = await this.codeTarget(userId, facts, 'set_password');
    await this.verifyCode(userId, 'set_password', to, code);

    const { error } = await this.admin.updateUserById(userId, {
      password: newPassword,
      app_metadata: { [PASSWORD_SET_FLAG]: true },
    });
    if (error) {
      if ((error as any).code === 'weak_password') {
        throw fail(400, 'WEAK_PASSWORD', error.message);
      }
      throw new ServiceUnavailableException(error.message);
    }
    return { passwordSet: true };
  }

  async changeEmail(
    userId: string,
    newEmail: string,
    code: string,
    currentPassword?: string,
  ) {
    const facts = await this.authFacts(userId);
    // Validates Google refusal, sameness and ownership before anything else.
    const to = await this.codeTarget(userId, facts, 'change_email', newEmail);

    if (AccountService.hasPassword(facts)) {
      if (!currentPassword) {
        throw fail(
          400,
          'CURRENT_PASSWORD_REQUIRED',
          'Enter your current password.',
        );
      }
      try {
        await this.authService.verifyPassword(facts.email!, currentPassword);
      } catch (err) {
        if (err instanceof UnauthorizedException) {
          // 400, not 401: a 401 reads to the app as a dead session.
          throw fail(
            400,
            'CURRENT_PASSWORD_INVALID',
            'Current password is incorrect.',
          );
        }
        throw err;
      }
    }

    await this.verifyCode(userId, 'change_email', to, code);

    // Leaving the internal Truecaller address: its random password is still
    // hashed but unknown, so record that explicitly before the email stops
    // being the signal for it.
    const leavingInternal =
      !!facts.email &&
      INTERNAL_EMAIL.test(facts.email) &&
      facts.appMeta?.[PASSWORD_SET_FLAG] !== true;

    const { error } = await this.admin.updateUserById(userId, {
      email: to,
      email_confirm: true,
      ...(leavingInternal
        ? { app_metadata: { [PASSWORD_SET_FLAG]: false } }
        : {}),
    });
    if (error) {
      if ((error as any).code === 'email_exists') {
        throw fail(409, 'EMAIL_TAKEN', 'That email belongs to another account.');
      }
      throw new ServiceUnavailableException(error.message);
    }
    // public.users follows via the on_auth_user_updated trigger; profiles has
    // no trigger.
    await this.dataSource.query(
      `UPDATE profiles SET email = $1 WHERE id = $2`,
      [to, userId],
    );
    return { email: to };
  }

  // ─────────────────────────── Google ───────────────────────────

  /**
   * Link a Google identity to the caller. Uses a throwaway client carrying
   * the CALLER's access token as its Authorization header: auth-js's
   * linkIdentity(id_token) posts `grant_type=id_token&link_identity` with that
   * header when the client holds no session, so no refresh token is needed.
   *
   * GoTrue mints a NEW session for the link. The app keeps its own session
   * (untouched, still valid), so the extra one is revoked with scope 'local'
   * — only when its session id differs from the caller's.
   */
  async linkGoogle(accessToken: string, idToken: string) {
    const client = createClient(
      this.config.get<string>('SUPABASE_URL')!,
      this.config.get<string>('SUPABASE_ANON_KEY')!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      },
    );

    const { data, error } = await client.auth.linkIdentity({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      const code = (error as any).code;
      const status = (error as any).status;
      if (code === 'manual_linking_disabled') {
        throw fail(
          400,
          'MANUAL_LINKING_DISABLED',
          'Linking sign-in methods is turned off.',
        );
      }
      if (code === 'identity_already_exists') {
        throw fail(
          409,
          'GOOGLE_ALREADY_LINKED',
          'That Google account is linked to another account.',
        );
      }
      if (status === 401 || status === 403 || code === 'bad_jwt') {
        throw fail(401, 'SESSION_EXPIRED', 'Your session expired.');
      }
      if (typeof status === 'number' && status >= 400 && status < 500) {
        throw fail(400, 'GOOGLE_LINK_FAILED', error.message);
      }
      throw new ServiceUnavailableException(error.message);
    }

    const extra = data?.session?.access_token;
    if (extra && sessionId(extra) && sessionId(extra) !== sessionId(accessToken)) {
      const { error: revokeError } = await this.admin.signOut(extra, 'local');
      if (revokeError) {
        this.logger.warn(`Could not revoke link session: ${revokeError.message}`);
      }
    }
    return { linked: true as const };
  }
}

/** The `session_id` claim, unverified — used only to avoid revoking the caller. */
export function sessionId(jwt: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'),
    );
    return typeof payload.session_id === 'string' ? payload.session_id : null;
  } catch {
    return null;
  }
}
