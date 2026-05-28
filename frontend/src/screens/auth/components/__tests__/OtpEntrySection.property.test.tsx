/**
 * Property test 10.3 — OtpEntrySection countdown gates "Verify" and "Resend OTP"
 *
 * Validates: Requirements 8.3, 8.7, 8.8 (Property 3 from design.md).
 *
 * Property: For any `(otp, ttl)` pair,
 *   - `OtpEntrySection`'s "Verify" handler invokes
 *     `TruecallerAuth.verifyOtp(otp, firstName, lastName)` iff
 *     `otp.length >= 4` (Reqs 8.7, 8.8).
 *   - When `otp.length < 4`, the "Invalid OTP" message is rendered and
 *     `verifyOtp` is NOT invoked (Req 8.8).
 *   - For any `ttl > 0`, the rendered "Resend OTP" control is disabled
 *     (Req 8.3); when `ttl <= 0`, the control is enabled.
 *
 * The component exposes `verifyOtp` and `subscribeToEvents` props so we can
 * drive it without touching the real native bridge or event emitter.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks — keep the component's environment minimal. The component imports
// TruecallerAuth/TruecallerEvents from `../../../native/TruecallerAuth`, but
// we override both via injected props so the real module is not exercised.
// We still mock `react-native/Libraries/Alert/Alert` to silence any stray
// alert call paths and avoid surfacing the real native module from
// `react-native`'s internals.
// ──────────────────────────────────────────────────────────────────────────────

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// `OtpEntrySection` imports `TruecallerAuth` / `TruecallerEvents` at module
// load. Importing the real wrapper instantiates a `NativeEventEmitter`, which
// asserts on a non-null native module under jest-expo's environment. Because
// the section accepts `verifyOtp` and `subscribeToEvents` props for direct
// injection, we replace the module with a minimal stub — the props bypass it
// at runtime and the stub merely keeps `import` from blowing up.
jest.mock('../../../../native/TruecallerAuth', () => ({
  __esModule: true,
  TruecallerAuth: {
    isUsable: jest.fn(async () => false),
    authenticate: jest.fn(),
    startManualVerification: jest.fn(),
    verifyOtp: jest.fn(),
    clear: jest.fn(),
  },
  TruecallerEvents: {
    onEvent: () => ({ remove: () => {} }),
  },
  TRUECALLER_EVENT_NAME: 'TruecallerVerificationEvent',
}));

// ──────────────────────────────────────────────────────────────────────────────
// Imports under test — must come after the mocks above.
// ──────────────────────────────────────────────────────────────────────────────

import { OtpEntrySection } from '../OtpEntrySection';
import type {
  TruecallerAuthResult,
  TruecallerEventListener,
  TruecallerVerificationEvent,
} from '../../../../native/TruecallerAuth';

// ──────────────────────────────────────────────────────────────────────────────
// Generators
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Digits-only OTP string with length in `[0, 8]`. Bounding length here keeps
 * the input space small but still spans the boundaries the property cares
 * about: empty (0), short (1–3), valid-min (4), valid-mid (5), valid-max (6),
 * and the over-max case (7–8) which the component clamps via `maxLength`.
 */
const otpArb: fc.Arbitrary<string> = fc
  .integer({ min: 0, max: 8 })
  .chain((len) =>
    len === 0
      ? fc.constant('')
      : fc.array(fc.integer({ min: 0, max: 9 }), {
          minLength: len,
          maxLength: len,
        }).map((digits) => digits.join('')),
  );

/**
 * TTL generator covering both sides of the boundary at `0`. The component
 * floors the TTL via `Math.max(0, Math.floor(ttl))`, so any negative or
 * zero value should resolve to "Resend OTP enabled" while any positive
 * value should leave it disabled.
 */
const ttlArb: fc.Arbitrary<number> = fc.integer({ min: -5, max: 600 });

/** Printable ASCII for first/last names — values are forwarded verbatim. */
const printableArb = fc
  .string({ minLength: 0, maxLength: 50, unit: 'grapheme-ascii' })
  .filter((s) => /^[\x20-\x7E]*$/.test(s));

const firstNameArb = printableArb.filter((s) => s.length > 0);
const lastNameArb = printableArb;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Build a no-op event subscriber that captures the listener for later use. */
function makeSubscriber(): {
  subscribe: (cb: TruecallerEventListener) => { remove: () => void };
  emit: (event: TruecallerVerificationEvent) => void;
  listeners: TruecallerEventListener[];
} {
  const listeners: TruecallerEventListener[] = [];
  return {
    listeners,
    subscribe: (cb) => {
      listeners.push(cb);
      return {
        remove: () => {
          const idx = listeners.indexOf(cb);
          if (idx >= 0) listeners.splice(idx, 1);
        },
      };
    },
    emit: (event) => {
      for (const cb of [...listeners]) cb(event);
    },
  };
}

const successResult: TruecallerAuthResult = {
  flow: 'OTP_VERIFICATION',
  successful: true,
  accessToken: 'tok',
};

// ──────────────────────────────────────────────────────────────────────────────
// Property test
// ──────────────────────────────────────────────────────────────────────────────

describe('OtpEntrySection — countdown gates Verify and Resend (Property 3)', () => {
  test('Verify invokes TruecallerAuth.verifyOtp iff otp.length >= 4 (Reqs 8.7, 8.8)', async () => {
    await fc.assert(
      fc.asyncProperty(
        otpArb,
        firstNameArb,
        lastNameArb,
        async (rawOtp, firstName, lastName) => {
          const verifyOtp = jest.fn(async () => successResult);
          const subscriber = makeSubscriber();

          const utils = render(
            <OtpEntrySection
              firstName={firstName}
              lastName={lastName}
              ttl={60}
              verifyOtp={verifyOtp}
              subscribeToEvents={subscriber.subscribe}
            />,
          );

          // The component clamps to digits and to maxLength=6, so the
          // observable length after entry is what gates the Verify handler.
          const expectedDigits = rawOtp.replace(/\D/g, '').slice(0, 6);

          // Type the OTP. Using the input's accessibility label
          // ("OTP") which the `Input` component derives from `label`.
          const otpField = utils.getByPlaceholderText('Enter the code');
          await act(async () => {
            fireEvent.changeText(otpField, rawOtp);
          });

          await act(async () => {
            fireEvent.press(utils.getByText('Verify'));
          });

          if (expectedDigits.length >= 4) {
            // Property: verifyOtp invoked exactly once with (otp, first, last).
            await waitFor(() => {
              expect(verifyOtp).toHaveBeenCalledTimes(1);
            });
            expect(verifyOtp).toHaveBeenCalledWith(
              expectedDigits,
              firstName,
              lastName,
            );
            // And no "Invalid OTP" error is surfaced.
            expect(utils.queryByText('Invalid OTP')).toBeNull();
          } else {
            // Property: verifyOtp NOT invoked, "Invalid OTP" displayed.
            expect(verifyOtp).not.toHaveBeenCalled();
            expect(utils.queryByText('Invalid OTP')).not.toBeNull();
          }

          utils.unmount();
        },
      ),
      { numRuns: 50 },
    );
  });

  test('Resend OTP control is disabled iff ttl > 0 (Req 8.3)', async () => {
    await fc.assert(
      fc.asyncProperty(ttlArb, async (ttl) => {
        const verifyOtp = jest.fn(async () => successResult);
        const onResend = jest.fn();
        const subscriber = makeSubscriber();

        const utils = render(
          <OtpEntrySection
            firstName="Aarav"
            lastName="Kumar"
            ttl={ttl}
            verifyOtp={verifyOtp}
            onResend={onResend}
            subscribeToEvents={subscriber.subscribe}
          />,
        );

        // The Resend control is the only TouchableOpacity that exposes
        // `accessibilityRole="button"` with disabled/enabled state. Its
        // text label flips based on the countdown:
        //   - ttl > 0  → "Resend OTP in m:ss"  (disabled)
        //   - ttl <= 0 → "Resend OTP"          (enabled)
        const resendLabel =
          ttl > 0 ? /^Resend OTP in / : /^Resend OTP$/;
        const resend = utils.getByText(resendLabel);

        // The TouchableOpacity that wraps the text is the closest tappable
        // ancestor — querying by `accessibilityState` is the most reliable
        // way to inspect the disabled flag.
        const tappable = utils.getByRole('button', {
          name: /Resend OTP/,
        });

        if (ttl > 0) {
          // Property: control reports disabled and onResend is NOT invoked.
          expect(tappable.props.accessibilityState).toEqual(
            expect.objectContaining({ disabled: true }),
          );

          await act(async () => {
            fireEvent.press(tappable);
          });
          expect(onResend).not.toHaveBeenCalled();
        } else {
          // Property: control reports enabled and onResend is invoked.
          expect(tappable.props.accessibilityState).toEqual(
            expect.objectContaining({ disabled: false }),
          );

          await act(async () => {
            fireEvent.press(tappable);
          });
          expect(onResend).toHaveBeenCalledTimes(1);
        }

        // Sanity: the visible label matched the regex we queried with.
        expect(resend).not.toBeNull();

        utils.unmount();
      }),
      { numRuns: 50 },
    );
  });
});
