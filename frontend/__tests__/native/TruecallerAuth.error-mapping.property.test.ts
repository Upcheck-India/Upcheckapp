/**
 * Property test for `mapTrueErrorCode` (Property 9 / Requirement 12.1).
 *
 * The native bridge's `TruecallerAuthModule.mapErrorCode(int)` switch is
 * mirrored as a pure TS helper in `src/native/TruecallerAuth.ts` so the
 * mapping can be exercised from JS. This file checks two universal
 * invariants of the helper:
 *
 *   - For every documented numeric `TrueError` constant (the 13 keys of
 *     `TRUE_ERROR_CODE_TO_CANONICAL`), `mapTrueErrorCode(n)` returns the
 *     corresponding canonical string.
 *   - For every other integer, `mapTrueErrorCode(n)` returns
 *     `ERROR_UNKNOWN_<n>`. The function never throws and never returns null.
 *
 * Validates: Requirements 12.1
 */

// `TruecallerAuth.ts` instantiates a `NativeEventEmitter` at module load
// time, which requires a non-null native module on iOS / non-Android JS
// runtimes (and the Jest test runner counts as one). We don't exercise the
// emitter here — only the pure `mapTrueErrorCode` helper — so we shim
// `react-native` with a minimal stub before the module is required.
jest.mock('react-native', () => {
  class NativeEventEmitterStub {
    addListener = jest.fn();
    removeListener = jest.fn();
    removeAllListeners = jest.fn();
  }
  return {
    Platform: { OS: 'android', select: (specifics: any) => specifics.android },
    NativeEventEmitter: NativeEventEmitterStub,
    NativeModules: {
      TruecallerAuthModule: {
        isUsable: jest.fn(),
        authenticate: jest.fn(),
        startManualVerification: jest.fn(),
        verifyOtp: jest.fn(),
        clear: jest.fn(),
        addListener: jest.fn(),
        removeListeners: jest.fn(),
      },
    },
  };
});

import fc from 'fast-check';
import {
  CANONICAL_TRUECALLER_ERROR_CODES,
  TRUE_ERROR_CODE_TO_CANONICAL,
  mapTrueErrorCode,
} from '../../src/native/TruecallerAuth';

const CANONICAL_SET = new Set<string>(CANONICAL_TRUECALLER_ERROR_CODES);
const KNOWN_CODES = new Set<number>(
  Object.keys(TRUE_ERROR_CODE_TO_CANONICAL).map((k) => Number(k)),
);

describe('mapTrueErrorCode totality (Property 9, Requirement 12.1)', () => {
  it('maps every documented TrueError constant to its canonical string', () => {
    for (const [codeStr, canonical] of Object.entries(
      TRUE_ERROR_CODE_TO_CANONICAL,
    )) {
      const code = Number(codeStr);
      expect(mapTrueErrorCode(code)).toBe(canonical);
      expect(CANONICAL_SET.has(canonical)).toBe(true);
    }
    // The set of canonical strings must be exactly the 13 listed in Req 12.1.
    expect(CANONICAL_TRUECALLER_ERROR_CODES).toHaveLength(13);
    expect(new Set(CANONICAL_TRUECALLER_ERROR_CODES).size).toBe(13);
  });

  it('returns ERROR_UNKNOWN_<n> or a canonical string for every integer', () => {
    fc.assert(
      fc.property(fc.integer(), (code) => {
        const result = mapTrueErrorCode(code);
        // 1) Never throws (fast-check would surface the exception otherwise).
        // 2) Never returns null / undefined.
        expect(result).not.toBeNull();
        expect(result).not.toBeUndefined();
        expect(typeof result).toBe('string');

        if (KNOWN_CODES.has(code)) {
          // For documented constants the result must be the canonical string
          // and that string must be one of the 13 in Requirement 12.1.
          const expected = TRUE_ERROR_CODE_TO_CANONICAL[code];
          expect(result).toBe(expected);
          expect(CANONICAL_SET.has(result as string)).toBe(true);
        } else {
          // For any other integer the result must be exactly the
          // `ERROR_UNKNOWN_<code>` fallback. It must NOT collide with any of
          // the 13 canonical strings.
          expect(result).toBe(`ERROR_UNKNOWN_${code}`);
          expect(CANONICAL_SET.has(result as string)).toBe(false);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('never throws on non-finite or fractional inputs', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.double({ noNaN: false }),
          fc.constant(Number.NaN),
          fc.constant(Number.POSITIVE_INFINITY),
          fc.constant(Number.NEGATIVE_INFINITY),
        ),
        (code) => {
          const result = mapTrueErrorCode(code);
          expect(typeof result).toBe('string');
          // Either canonical (when the truncated value matches a known code)
          // or an ERROR_UNKNOWN_ fallback. Both branches are accepted.
          if (CANONICAL_SET.has(result as string)) {
            return;
          }
          expect(result.startsWith('ERROR_UNKNOWN_')).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});
