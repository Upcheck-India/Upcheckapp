/**
 * Task 11.2 — Controller integration test for `POST /auth/supabase/oauth/truecaller`.
 *
 * Verifies the request/response contract for the Truecaller endpoint:
 *
 *  • Requirement 11.5 — successful verification returns HTTP 200 with the
 *    same shape as `POST /auth/supabase/signin`: `{ message, user, session }`.
 *  • Requirement 13.4 — every body that fails DTO validation returns HTTP
 *    401 with `{ success: false, message: 'Invalid request' }`, and the
 *    offending field's value is never echoed back.
 *
 * The test boots a real NestJS app via `Test.createTestingModule(...)`,
 * applies the same global ValidationPipe configuration as `main.ts`
 * (whitelist + transform), mocks `TruecallerService` and
 * `SupabaseAuthService` at the providers layer, and drives the route
 * end-to-end with supertest. This way we exercise the controller's
 * dispatcher logic, the method-level validation pipe, and the class-level
 * XOR invariant on {@link TruecallerAuthDto} all at once — while keeping
 * the upstream RSA verifier and Supabase client out of the loop.
 */

import 'reflect-metadata';
import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { SupabaseAuthController } from './supabase-auth.controller';
import { SupabaseAuthService } from './supabase-auth.service';
import { TwoFactorService } from './two-factor.service';
import { RedisService } from '../redis/redis.service';
import {
  TruecallerService,
  VerifiedTruecallerProfile,
} from './truecaller.service';

/**
 * The signin response shape we are asserting parity against. Defined once
 * so the assertions in every happy-path test read identically.
 */
const SIGNIN_RESPONSE_KEYS = ['message', 'user', 'session'] as const;

describe('SupabaseAuthController — POST /auth/supabase/oauth/truecaller', () => {
  let app: INestApplication;

  // Both providers are mocked to method-level granularity; only the methods
  // touched by `truecallerOAuth` need to be defined. Any unexpected call
  // would throw "is not a function" and fail the test loudly.
  const truecallerServiceMock: {
    verifySignedPayload: jest.Mock;
    verifyAccessToken: jest.Mock;
  } = {
    verifySignedPayload: jest.fn(),
    verifyAccessToken: jest.fn(),
  };

  const supabaseAuthServiceMock: {
    signInWithTruecaller: jest.Mock;
  } = {
    signInWithTruecaller: jest.fn(),
  };

  /** Verified profile returned by the mocked TruecallerService. */
  const verifiedProfile: VerifiedTruecallerProfile = {
    phoneNumber: '+919876543210',
    firstName: 'Verified',
    lastName: 'User',
    email: 'verified@example.com',
    avatarUrl: 'https://example.com/avatar.png',
  };

  /**
   * Canonical Supabase result returned by the mocked
   * SupabaseAuthService.signInWithTruecaller. The shape mirrors what
   * signin returns so we can compare both responses byte-for-byte.
   */
  const supabaseResult = {
    user: { id: 'auth-user-123', email: 'verified@example.com' },
    session: {
      access_token: 'access.jwt.token',
      refresh_token: 'refresh.token',
      expires_in: 3600,
      token_type: 'bearer',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupabaseAuthController],
      providers: [
        { provide: TruecallerService, useValue: truecallerServiceMock },
        { provide: SupabaseAuthService, useValue: supabaseAuthServiceMock },
        { provide: TwoFactorService, useValue: { isEnabled: jest.fn().mockResolvedValue(false) } },
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
      ],
    }).compile();

    app = module.createNestApplication();
    // Mirror main.ts so the DTO's class-validator decorators and the
    // class-level XOR invariant fire exactly as they do in production.
    // The controller's method-level pipe still wins on the truecaller
    // route because Nest evaluates method-level pipes before global ones.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ──────────────────────────────────────────────────────────────────
  // Happy paths — Requirement 11.5
  // ──────────────────────────────────────────────────────────────────

  describe('Requirement 11.5 — response shape matches POST /auth/supabase/signin', () => {
    it('Flow A (signed payload) returns 200 with { message, user, session }', async () => {
      truecallerServiceMock.verifySignedPayload.mockResolvedValue(
        verifiedProfile,
      );
      supabaseAuthServiceMock.signInWithTruecaller.mockResolvedValue(
        supabaseResult,
      );

      const res = await request(app.getHttpServer())
        .post('/auth/supabase/oauth/truecaller')
        .send({
          payload: 'eyJyZXF1ZXN0Tm9uY2UiOiJhYmMifQ==',
          signature: 'sig-base64',
          signatureAlgorithm: 'SHA512withRSA',
          requestNonce: 'abc',
          phoneNumber: '+919876543210',
          firstName: 'Submitted',
          lastName: 'Name',
        })
        .expect(200);

      // Same three top-level keys as `POST /auth/supabase/signin`.
      expect(Object.keys(res.body).sort()).toEqual(
        [...SIGNIN_RESPONSE_KEYS].sort(),
      );
      expect(res.body.user).toEqual(supabaseResult.user);
      expect(res.body.session).toEqual(supabaseResult.session);
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);

      // Flow A → verifySignedPayload, never verifyAccessToken.
      expect(truecallerServiceMock.verifySignedPayload).toHaveBeenCalledTimes(1);
      expect(truecallerServiceMock.verifyAccessToken).not.toHaveBeenCalled();

      // Requirement 11.1 — the controller forwards the *verified* profile
      // values, not the request body's firstName/lastName/phoneNumber.
      expect(supabaseAuthServiceMock.signInWithTruecaller).toHaveBeenCalledWith({
        phoneNumber: verifiedProfile.phoneNumber,
        firstName: verifiedProfile.firstName,
        lastName: verifiedProfile.lastName,
        email: verifiedProfile.email,
        avatarUrl: verifiedProfile.avatarUrl,
      });
    });

    it('Flow B (access token) returns 200 with { message, user, session }', async () => {
      truecallerServiceMock.verifyAccessToken.mockResolvedValue(
        verifiedProfile,
      );
      supabaseAuthServiceMock.signInWithTruecaller.mockResolvedValue(
        supabaseResult,
      );

      const res = await request(app.getHttpServer())
        .post('/auth/supabase/oauth/truecaller')
        .send({
          accessToken: 'opaque-truecaller-token',
          phoneNumber: '+919876543210',
          firstName: 'Submitted',
          lastName: 'Name',
        })
        .expect(200);

      expect(Object.keys(res.body).sort()).toEqual(
        [...SIGNIN_RESPONSE_KEYS].sort(),
      );
      expect(res.body.user).toEqual(supabaseResult.user);
      expect(res.body.session).toEqual(supabaseResult.session);
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);

      // Flow B → verifyAccessToken, never verifySignedPayload.
      expect(truecallerServiceMock.verifyAccessToken).toHaveBeenCalledTimes(1);
      expect(truecallerServiceMock.verifyAccessToken).toHaveBeenCalledWith(
        'opaque-truecaller-token',
        '+919876543210',
      );
      expect(truecallerServiceMock.verifySignedPayload).not.toHaveBeenCalled();
    });

    it('Flow A and Flow B produce structurally identical response bodies', async () => {
      // Arrange: both flows resolve to the same Supabase result and the
      // same verified profile, so the two responses should have the same
      // top-level keys and same user/session payloads.
      truecallerServiceMock.verifySignedPayload.mockResolvedValue(
        verifiedProfile,
      );
      truecallerServiceMock.verifyAccessToken.mockResolvedValue(
        verifiedProfile,
      );
      supabaseAuthServiceMock.signInWithTruecaller.mockResolvedValue(
        supabaseResult,
      );

      const flowARes = await request(app.getHttpServer())
        .post('/auth/supabase/oauth/truecaller')
        .send({
          payload: 'eyJyZXF1ZXN0Tm9uY2UiOiJhYmMifQ==',
          signature: 'sig',
          signatureAlgorithm: 'SHA512withRSA',
          requestNonce: 'abc',
          phoneNumber: '+919876543210',
        })
        .expect(200);

      const flowBRes = await request(app.getHttpServer())
        .post('/auth/supabase/oauth/truecaller')
        .send({
          accessToken: 'opaque-truecaller-token',
          phoneNumber: '+919876543210',
        })
        .expect(200);

      expect(Object.keys(flowARes.body).sort()).toEqual(
        Object.keys(flowBRes.body).sort(),
      );
      expect(flowARes.body.user).toEqual(flowBRes.body.user);
      expect(flowARes.body.session).toEqual(flowBRes.body.session);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Validation failures — Requirement 13.4
  // ──────────────────────────────────────────────────────────────────

  describe('Requirement 13.4 — invalid requests return 401 { success: false, message: "Invalid request" }', () => {
    it('rejects a body with neither payload nor accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/supabase/oauth/truecaller')
        .send({
          phoneNumber: '+919876543210',
          firstName: 'No',
          lastName: 'Credentials',
        })
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        message: 'Invalid request',
      });

      // Belt-and-suspenders: validation must short-circuit before the
      // verifier is ever called.
      expect(
        truecallerServiceMock.verifySignedPayload,
      ).not.toHaveBeenCalled();
      expect(truecallerServiceMock.verifyAccessToken).not.toHaveBeenCalled();
      expect(
        supabaseAuthServiceMock.signInWithTruecaller,
      ).not.toHaveBeenCalled();
    });

    it('rejects a body with BOTH payload and accessToken (XOR violation)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/supabase/oauth/truecaller')
        .send({
          // Both credential channels — exactly the ambiguity the
          // class-level `TruecallerExactlyOneCredentialConstraint` is
          // there to catch.
          payload: 'eyJyZXF1ZXN0Tm9uY2UiOiJhYmMifQ==',
          signature: 'sig',
          signatureAlgorithm: 'SHA512withRSA',
          requestNonce: 'abc',
          accessToken: 'opaque-truecaller-token',
          phoneNumber: '+919876543210',
        })
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        message: 'Invalid request',
      });

      // Neither verifier should run when validation fails. This guards
      // the controller's "verified profile, never request body"
      // contract from Requirement 11.1.
      expect(
        truecallerServiceMock.verifySignedPayload,
      ).not.toHaveBeenCalled();
      expect(truecallerServiceMock.verifyAccessToken).not.toHaveBeenCalled();
      expect(
        supabaseAuthServiceMock.signInWithTruecaller,
      ).not.toHaveBeenCalled();
    });

    it('does not echo offending field values in the validation error body', async () => {
      // Sentinel value the response must NOT contain. The 13.4 rule
      // exists to keep secrets (e.g., a leaked accessToken) out of the
      // response body that may end up in client-side logs.
      const sentinel = 'SECRET-TOKEN-42';

      const res = await request(app.getHttpServer())
        .post('/auth/supabase/oauth/truecaller')
        .send({
          accessToken: sentinel,
          payload: 'should-not-be-allowed-with-token',
          phoneNumber: '+919876543210',
        })
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        message: 'Invalid request',
      });
      expect(JSON.stringify(res.body)).not.toContain(sentinel);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Verifier failures pass through unchanged
  // ──────────────────────────────────────────────────────────────────

  describe('TruecallerService rejection passes through as HTTP 401', () => {
    it('Flow A — verifySignedPayload throwing UnauthorizedException returns 401 with the verifier message', async () => {
      // The service throws the exact spec messages from Requirement 9
      // (e.g., "Invalid signature"); Nest maps the UnauthorizedException
      // straight to HTTP 401 and the controller never wraps or rewrites
      // the body — so the client sees the same payload the verifier
      // produced.
      truecallerServiceMock.verifySignedPayload.mockRejectedValue(
        new UnauthorizedException({
          success: false,
          message: 'Invalid signature',
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/supabase/oauth/truecaller')
        .send({
          payload: 'eyJyZXF1ZXN0Tm9uY2UiOiJhYmMifQ==',
          signature: 'sig',
          signatureAlgorithm: 'SHA512withRSA',
          requestNonce: 'abc',
          phoneNumber: '+919876543210',
        })
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        message: 'Invalid signature',
      });
      expect(
        supabaseAuthServiceMock.signInWithTruecaller,
      ).not.toHaveBeenCalled();
    });

    it('Flow B — verifyAccessToken throwing UnauthorizedException returns 401 with the verifier message', async () => {
      truecallerServiceMock.verifyAccessToken.mockRejectedValue(
        new UnauthorizedException({
          success: false,
          message: 'Invalid access token',
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/supabase/oauth/truecaller')
        .send({
          accessToken: 'expired-or-bogus-token',
          phoneNumber: '+919876543210',
        })
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        message: 'Invalid access token',
      });
      expect(
        supabaseAuthServiceMock.signInWithTruecaller,
      ).not.toHaveBeenCalled();
    });
  });
});
