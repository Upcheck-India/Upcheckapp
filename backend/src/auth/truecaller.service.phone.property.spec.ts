/**
 * Property-based tests for {@link TruecallerService.normalizePhone}.
 *
 * Property 10 (design.md): For any 10-digit Indian phone number `D`
 * matching `^[6-9]\d{9}$` and for any two strings `a`, `b` constructible
 * from `D` by inserting an optional leading `+91` or `91` and an
 * arbitrary number of non-digit separators (spaces, hyphens, parens)
 * between digits, `normalizePhone(a) === normalizePhone(b) === D`. For
 * any two distinct 10-digit strings `D1 ≠ D2`, the normalized outputs
 * are unequal.
 *
 * Additional invariants verified here:
 *  - Idempotence: `normalizePhone(normalizePhone(s)) === normalizePhone(s)`
 *    for any string `s`.
 *  - Non-digit characters are stripped uniformly regardless of position.
 *
 * **Validates: Requirements 10.4**
 */

import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { TruecallerService } from './truecaller.service';

function buildService(): TruecallerService {
  return new TruecallerService(new ConfigService({}));
}

/**
 * Indian local number arbitrary: a 10-digit string whose first digit is
 * 6-9, matching the `^[6-9]\d{9}$` schema enforced by the phone-entry
 * UI (Requirement 7.3) and used as the canonical normalized form.
 */
const localPhoneArb = fc.stringMatching(/^[6-9][0-9]{9}$/);

/**
 * Country-code prefix arbitrary covering the three forms a Truecaller
 * profile or a user-typed phone may arrive in: `+91`, `91`, or no
 * prefix at all.
 */
const prefixArb = fc.constantFrom('+91', '91', '');

/**
 * Non-digit separator arbitrary. The set of characters tested against
 * matches the kinds of characters real-world UIs emit when they auto-
 * format phone numbers (spaces, hyphens, parens, dots). Each generated
 * separator string can be any length in [0, 4] so we exercise both the
 * empty case and adversarial multi-character runs.
 */
const separatorArb = fc.stringMatching(/^[ \-().\t]{0,4}$/);

/**
 * Build a noisy variant of `local` by sprinkling non-digit separators
 * between every digit (including before the first and after the last).
 * Returns the noisy 10-digit form without any country-code prefix.
 */
function noisyArb(local: string): fc.Arbitrary<string> {
  // 11 separator slots for a 10-digit number: one before each digit and
  // one trailing slot.
  const seps = fc.array(separatorArb, { minLength: 11, maxLength: 11 });
  return seps.map((arr) => {
    let out = '';
    for (let i = 0; i < local.length; i++) {
      out += arr[i] + local[i];
    }
    out += arr[local.length];
    return out;
  });
}

/**
 * Build a fully-constructed input string by combining a prefix,
 * optional separators between the prefix and the local number, and the
 * noisy local form.
 */
function constructedArb(
  local: string,
): fc.Arbitrary<{ input: string; local: string }> {
  return fc
    .tuple(prefixArb, separatorArb, noisyArb(local))
    .map(([prefix, gap, body]) => ({
      input: prefix + gap + body,
      local,
    }));
}

describe('TruecallerService.normalizePhone — Property 10', () => {
  it('canonicalizes any +91 / 91 / bare form back to the 10-digit local number', () => {
    const svc = buildService();
    fc.assert(
      fc.property(
        localPhoneArb.chain((local) => constructedArb(local)),
        ({ input, local }) => {
          expect(svc.normalizePhone(input)).toBe(local);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('agrees on any two adversarial-but-equivalent forms of the same local number', () => {
    const svc = buildService();
    fc.assert(
      fc.property(
        localPhoneArb.chain((local) =>
          fc.tuple(
            constructedArb(local),
            constructedArb(local),
            fc.constant(local),
          ),
        ),
        ([{ input: a }, { input: b }, local]) => {
          const na = svc.normalizePhone(a);
          const nb = svc.normalizePhone(b);
          expect(na).toBe(nb);
          expect(na).toBe(local);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('keeps distinct 10-digit local numbers distinct after normalization', () => {
    const svc = buildService();
    fc.assert(
      fc.property(
        localPhoneArb,
        localPhoneArb,
        (a, b) => {
          fc.pre(a !== b);
          expect(svc.normalizePhone(a)).not.toBe(svc.normalizePhone(b));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('is idempotent for any string input', () => {
    const svc = buildService();
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = svc.normalizePhone(s);
        const twice = svc.normalizePhone(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 200 },
    );
  });

  it('strips non-digit characters uniformly regardless of position', () => {
    // For a generic input, the normalized output is exactly the
    // sequence of digits that survives the optional leading +91/91
    // strip. The separator position should never matter.
    const svc = buildService();
    fc.assert(
      fc.property(
        localPhoneArb.chain((local) => constructedArb(local)),
        separatorArb,
        ({ input, local }, extraSep) => {
          // Sprinkle extra separators at random positions; the result
          // should still normalize to the same local number.
          const before = svc.normalizePhone(input);
          const after = svc.normalizePhone(extraSep + input + extraSep);
          expect(after).toBe(before);
          expect(after).toBe(local);
        },
      ),
      { numRuns: 100 },
    );
  });
});
