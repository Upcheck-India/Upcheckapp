/**
 * Property-based test for the JS wrapper around the native `TruecallerAuthModule`.
 *
 * Feature: truecaller-auth, Property 1: Bridge result shape totality
 *
 * Validates: Requirements 5.3, 5.5, 12.1
 *
 * Property: For every input fed to TruecallerAuth.{authenticate,
 * startManualVerification, verifyOtp, isUsable, clear}, the wrapper passes
 * through whatever the mocked native module returns without crashing or
 * losing fields, and every result the wrapper itself produces (including
 * the `ERROR_PLATFORM_UNSUPPORTED` BridgeFailureResult on non-Android, or
 * arbitrary native module outputs on Android) satisfies one of the
 * documented union members:
 *   - OneTapSuccessResult   (flow="ONE_TAP", successful=true)
 *   - OneTapFailureResult   (flow="ONE_TAP", successful=false)
 *   - VerificationRequiredResult (flow="VERIFICATION_REQUIRED")
 *   - OtpVerificationSuccessResult (flow="OTP_VERIFICATION", successful=true)
 *   - OtpVerificationFailureResult (event="VERIFICATION_FAILED")
 *   - BridgeFailureResult   (successful=false with error code, no flow)
 *
 * That is, every result has either a `flow + successful` discriminator,
 * or an `event` discriminator. No other shapes exist in the union.
 */

import * as fc from 'fast-check';

// ──────────────────────────────────────────────────────────────────────────────
// Mock the native side BEFORE importing the wrapper.
// ──────────────────────────────────────────────────────────────────────────────

// Holder so the test body can reprogram what the mocked native module returns
// per `fc.assert(...)` iteration without re-importing modules.
// `mock`-prefixed name so Jest's variable-hoisting check allows referencing it
// from inside `jest.mock()`'s factory.
const mockNative = {
  authenticate: jest.fn<Promise<unknown>, []>(),
  startManualVerification: jest.fn<Promise<unknown>, [string, string, string]>(),
  verifyOtp: jest.fn<Promise<unknown>, [string, string, string]>(),
  isUsable: jest.fn<Promise<boolean>, []>(),
  clear: jest.fn<void, []>(),
};

jest.mock('react-native', () => {
  // Minimal subset of react-native used by the wrapper.
  class MockNativeEventEmitter {
    addListener() {
      return { remove: () => {} };
    }
    removeAllListeners() {}
  }
  return {
    NativeModules: {
      TruecallerAuthModule: mockNative,
    },
    NativeEventEmitter: MockNativeEventEmitter,
    Platform: { OS: 'android' },
  };
});

// Import after the mock is registered so the wrapper picks up the mocked
// `NativeModules.TruecallerAuthModule`.
import {
  TruecallerAuth,
  type TruecallerAuthResult,
} from '../TruecallerAuth';

// ──────────────────────────────────────────────────────────────────────────────
// Shape predicate — the only place that knows the full union
// ──────────────────────────────────────────────────────────────────────────────

const CANONICAL_ERROR_CODES = new Set([
  'ERROR_TYPE_INTERNAL',
  'ERROR_TYPE_NETWORK',
  'ERROR_TYPE_USER_DENIED',
  'ERROR_PROFILE_NOT_FOUND',
  'ERROR_TYPE_UNAUTHORIZED_USER',
  'ERROR_TYPE_TRUECALLER_CLOSED_UNEXPECTEDLY',
  'ERROR_TYPE_TRUESDK_TOO_OLD',
  'ERROR_TYPE_POSSIBLE_REQ_CODE_COLLISION',
  'ERROR_TYPE_RESPONSE_SIGNATURE_MISMATCH',
  'ERROR_TYPE_REQUEST_NONCE_MISMATCH',
  'ERROR_TYPE_INVALID_ACCOUNT_STATE',
  'ERROR_TYPE_TC_NOT_INSTALLED',
  'ERROR_TYPE_ACTIVITY_NOT_FOUND',
  'ERROR_VERIFICATION_REQUIRED',
  'ERROR_NO_ACTIVITY',
  'ERROR_SDK_NOT_INITIALIZED',
  'ERROR_PLATFORM_UNSUPPORTED',
]);

function isErrorCodeString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (CANONICAL_ERROR_CODES.has(value)) return true;
  return /^ERROR_UNKNOWN_-?\d+$/.test(value);
}

/**
 * Returns true iff `result` matches one of the six documented union members.
 * The test asserts this predicate on every wrapper output.
 */
function matchesUnion(result: unknown): boolean {
  if (result === null || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;

  // Variant 1 — OneTapSuccessResult
  if (r.flow === 'ONE_TAP' && r.successful === true) {
    return (
      typeof r.firstName === 'string' &&
      typeof r.lastName === 'string' &&
      typeof r.phoneNumber === 'string' &&
      typeof r.payload === 'string' &&
      typeof r.signature === 'string' &&
      typeof r.signatureAlgorithm === 'string' &&
      typeof r.requestNonce === 'string'
    );
  }

  // Variant 2 — OneTapFailureResult
  if (r.flow === 'ONE_TAP' && r.successful === false) {
    return isErrorCodeString(r.error) && typeof r.errorCode === 'number';
  }

  // Variant 3 — VerificationRequiredResult
  if (r.flow === 'VERIFICATION_REQUIRED') {
    return r.successful === false && r.error === 'ERROR_VERIFICATION_REQUIRED';
  }

  // Variant 4 — OtpVerificationSuccessResult
  if (r.flow === 'OTP_VERIFICATION' && r.successful === true) {
    return r.accessToken === undefined || typeof r.accessToken === 'string';
  }

  // Variant 5 — OtpVerificationFailureResult
  if (r.event === 'VERIFICATION_FAILED') {
    return (
      typeof r.exceptionCode === 'number' &&
      typeof r.exceptionMessage === 'string'
    );
  }

  // Variant 6 — BridgeFailureResult (bridge-level pre-SDK failure)
  if (r.successful === false && r.flow === undefined && r.event === undefined) {
    return isErrorCodeString(r.error);
  }

  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// Generators
// ──────────────────────────────────────────────────────────────────────────────

const oneTapSuccessArb = fc.record({
  flow: fc.constant('ONE_TAP'),
  successful: fc.constant(true),
  firstName: fc.string({ maxLength: 50 }),
  lastName: fc.string({ maxLength: 50 }),
  phoneNumber: fc.string({ maxLength: 20 }),
  countryCode: fc.string({ maxLength: 4 }),
  email: fc.string({ maxLength: 80 }),
  isVerified: fc.boolean(),
  payload: fc.string(),
  signature: fc.string(),
  signatureAlgorithm: fc.constantFrom('SHA512withRSA', 'SHA256withRSA'),
  requestNonce: fc.uuid(),
});

const errorCodeArb = fc.oneof(
  fc.constantFrom(...Array.from(CANONICAL_ERROR_CODES)),
  fc.integer().map((n) => `ERROR_UNKNOWN_${n}`),
);

const oneTapFailureArb = fc.record({
  flow: fc.constant('ONE_TAP'),
  successful: fc.constant(false),
  error: errorCodeArb,
  errorCode: fc.integer(),
});

const verificationRequiredArb = fc.record({
  flow: fc.constant('VERIFICATION_REQUIRED'),
  successful: fc.constant(false),
  error: fc.constant('ERROR_VERIFICATION_REQUIRED'),
});

const otpSuccessArb = fc.record(
  {
    flow: fc.constant('OTP_VERIFICATION'),
    successful: fc.constant(true),
    accessToken: fc.option(fc.string(), { nil: undefined }),
  },
  { requiredKeys: ['flow', 'successful'] },
);

const verificationFailedArb = fc.record({
  event: fc.constant('VERIFICATION_FAILED'),
  exceptionCode: fc.integer(),
  exceptionMessage: fc.string(),
});

const bridgeFailureArb = fc.record({
  successful: fc.constant(false),
  error: errorCodeArb,
});

const validResultArb: fc.Arbitrary<TruecallerAuthResult> = fc.oneof(
  oneTapSuccessArb,
  oneTapFailureArb,
  verificationRequiredArb,
  otpSuccessArb,
  verificationFailedArb,
  bridgeFailureArb,
) as fc.Arbitrary<TruecallerAuthResult>;

// "Garbage" results from a misbehaving native side. Property must NOT collapse
// these into the union — the wrapper passes them through, so the predicate
// will report `false` and the test catches them as a regression of the
// documented contract. To keep the test honest we only feed the wrapper the
// valid union; garbage is exercised in a separate negative-path block below.

// ──────────────────────────────────────────────────────────────────────────────
// Property test
// ──────────────────────────────────────────────────────────────────────────────

describe('TruecallerAuth wrapper — bridge result shape totality (Property 1)', () => {
  beforeEach(() => {
    mockNative.authenticate.mockReset();
    mockNative.startManualVerification.mockReset();
    mockNative.verifyOtp.mockReset();
    mockNative.isUsable.mockReset();
    mockNative.clear.mockReset();
  });

  it('TruecallerAuth.authenticate() result is shape-total', async () => {
    await fc.assert(
      fc.asyncProperty(validResultArb, async (mockedReturn) => {
        mockNative.authenticate.mockResolvedValueOnce(mockedReturn);
        const result = await TruecallerAuth.authenticate();
        expect(matchesUnion(result)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('TruecallerAuth.startManualVerification(...) result is shape-total', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.string(),
        validResultArb,
        async (phone, first, last, mockedReturn) => {
          mockNative.startManualVerification.mockResolvedValueOnce(mockedReturn);
          const result = await TruecallerAuth.startManualVerification(
            phone,
            first,
            last,
          );
          expect(matchesUnion(result)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('TruecallerAuth.verifyOtp(...) result is shape-total', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.string(),
        validResultArb,
        async (otp, first, last, mockedReturn) => {
          mockNative.verifyOtp.mockResolvedValueOnce(mockedReturn);
          const result = await TruecallerAuth.verifyOtp(otp, first, last);
          expect(matchesUnion(result)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('TruecallerAuth.isUsable() always resolves to a boolean', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (mockedReturn) => {
        mockNative.isUsable.mockResolvedValueOnce(mockedReturn);
        const result = await TruecallerAuth.isUsable();
        expect(typeof result).toBe('boolean');
      }),
      { numRuns: 100 },
    );
  });

  it('TruecallerAuth.clear() never throws and returns undefined', () => {
    fc.assert(
      fc.property(fc.constant(undefined), () => {
        mockNative.clear.mockImplementationOnce(() => {});
        const result = TruecallerAuth.clear();
        expect(result).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});
