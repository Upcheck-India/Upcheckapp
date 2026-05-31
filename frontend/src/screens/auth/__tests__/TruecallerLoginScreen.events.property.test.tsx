/**
 * Property test 10.4 — `_INITIATED` events transition to corresponding waiting phase
 *
 * Validates: Requirements 8.1, 8.2 (Property 4 from design.md).
 *
 * Property: For any event emitted on the `TruecallerVerificationEvent`
 * channel of the form `{ event: "OTP_INITIATED", ttl: T }` or
 * `{ event: "MISSED_CALL_INITIATED", ttl: T }`, the
 * `TruecallerLoginScreen` FSM transitions `phase` to `awaiting_otp` or
 * `awaiting_missed_call` respectively, and the displayed TTL countdown
 * initializes from the supplied `T` (`parseTtl` clamps non-positive,
 * non-numeric, or null TTL strings to zero per the wrapper helper).
 *
 * The test mocks the events channel returned by `TruecallerEvents.onEvent`
 * with a controllable subscription so each fast-check iteration can fire
 * an arbitrary `_INITIATED` event with a generated `ttl` and assert the
 * screen lands in the correct phase with the correct rendered TTL.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks — heavy modules are replaced with minimal fakes so we can drive the
// events channel directly without touching real native code, real HTTP,
// real auth-store persistence, or real permission prompts.
// ──────────────────────────────────────────────────────────────────────────────

const eventListeners: Array<(event: unknown) => void> = [];
const emitTruecallerEvent = (event: unknown): void => {
  // Iterate over a snapshot so listeners that unsubscribe during dispatch
  // don't perturb the iteration.
  for (const listener of [...eventListeners]) {
    listener(event);
  }
};

const mockAuthenticate = jest.fn();
const mockStartManualVerification = jest.fn();
const mockVerifyOtp = jest.fn();
const mockClear = jest.fn();

jest.mock('../../../native/TruecallerAuth', () => ({
  __esModule: true,
  TruecallerAuth: {
    isUsable: jest.fn(async () => true),
    authenticate: (...args: unknown[]) => mockAuthenticate(...args),
    startManualVerification: (...args: unknown[]) =>
      mockStartManualVerification(...args),
    verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    clear: mockClear,
  },
  TruecallerEvents: {
    onEvent: (cb: (event: unknown) => void) => {
      eventListeners.push(cb);
      return {
        remove: () => {
          const idx = eventListeners.indexOf(cb);
          if (idx >= 0) eventListeners.splice(idx, 1);
        },
      };
    },
  },
  TRUECALLER_EVENT_NAME: 'TruecallerVerificationEvent',
}));

const mockRequestTruecallerPermissions = jest.fn(async () => ({
  granted: true,
  deniedPermissions: [] as string[],
}));

jest.mock('../../../native/truecallerPermissions', () => ({
  __esModule: true,
  requestTruecallerPermissions: (...args: Parameters<typeof mockRequestTruecallerPermissions>) =>
    mockRequestTruecallerPermissions(...args),
}));

const mockApiPost = jest.fn();

jest.mock('../../../api/client', () => ({
  __esModule: true,
  default: {
    post: (...args: Parameters<typeof mockApiPost>) => mockApiPost(...args),
  },
}));

const mockSetSession = jest.fn();

jest.mock('../../../store/authStore', () => ({
  __esModule: true,
  useAuthStore: (
    selector: (state: { setSession: typeof mockSetSession }) => unknown,
  ) => selector({ setSession: mockSetSession }),
}));

// Quiet React Native's Alert during property runs.
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Stub `react-native-safe-area-context` so the screen mounts without a real
// SafeAreaProvider tree (the test only cares about FSM transitions).
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children, ...rest }: { children: React.ReactNode }) =>
      React.createElement(View, rest, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  };
});

// ──────────────────────────────────────────────────────────────────────────────
// Imports — must come after the mocks above.
// ──────────────────────────────────────────────────────────────────────────────

import { TruecallerLoginScreen } from '../TruecallerLoginScreen';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers mirroring the FSM under test
// ──────────────────────────────────────────────────────────────────────────────

/** Mirror of `parseTtl` in TruecallerLoginScreen.tsx. */
function parseTtl(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Mirror of `formatTtl` in OtpEntrySection.tsx — `m:ss` formatting. */
function formatTtl(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

const noopNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

function resetAllMocks(): void {
  eventListeners.length = 0;
  mockAuthenticate.mockReset();
  mockStartManualVerification.mockReset();
  mockVerifyOtp.mockReset();
  mockClear.mockReset();
  mockApiPost.mockReset();
  mockApiPost.mockResolvedValue({
    data: { message: 'ok', user: null, session: null },
  });
  mockRequestTruecallerPermissions.mockReset();
  mockRequestTruecallerPermissions.mockResolvedValue({
    granted: true,
    deniedPermissions: [],
  });
  mockSetSession.mockReset();
  noopNavigation.navigate.mockReset();
  noopNavigation.replace.mockReset();
  noopNavigation.goBack.mockReset();
}

// ──────────────────────────────────────────────────────────────────────────────
// Generators
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Strings the SDK actually delivers in the `ttl` field of an `_INITIATED`
 * event: WritableMap encodes integers as strings. We cover positive-integer
 * TTLs (the canonical case), zero, negative, non-numeric, empty, and null
 * to exercise every branch of `parseTtl`.
 */
const ttlStringArb: fc.Arbitrary<string | null> = fc.oneof(
  // Positive integer seconds — the canonical SDK encoding.
  fc.integer({ min: 1, max: 24 * 60 * 60 }).map((n) => String(n)),
  // Zero / negative — `parseTtl` clamps to 0.
  fc.integer({ min: -3600, max: 0 }).map((n) => String(n)),
  // Non-numeric noise — `parseTtl` clamps to 0.
  fc.string({ minLength: 0, maxLength: 8, unit: 'grapheme-ascii' })
    .filter((s) => !/^-?\d/.test(s)),
  // Null — `parseTtl` clamps to 0.
  fc.constant(null),
);

const otpInitiatedEventArb = fc.record({
  event: fc.constant('OTP_INITIATED' as const),
  ttl: ttlStringArb,
});

const missedCallInitiatedEventArb = fc.record({
  event: fc.constant('MISSED_CALL_INITIATED' as const),
  ttl: ttlStringArb,
});

const initiatedEventArb = fc.oneof(
  otpInitiatedEventArb,
  missedCallInitiatedEventArb,
);

// ──────────────────────────────────────────────────────────────────────────────
// Property tests
// ──────────────────────────────────────────────────────────────────────────────

describe('TruecallerLoginScreen — `_INITIATED` events transition to waiting phase (Property 4)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('Property 4a — OTP_INITIATED transitions to `awaiting_otp` with supplied TTL (Req 8.1)', async () => {
    await fc.assert(
      fc.asyncProperty(otpInitiatedEventArb, async (event) => {
        resetAllMocks();
        const utils = render(
          <TruecallerLoginScreen navigation={noopNavigation} />,
        );

        // Wait for the events listener to be wired up by the effect.
        await waitFor(() => {
          expect(eventListeners.length).toBeGreaterThan(0);
        });

        await act(async () => {
          emitTruecallerEvent(event);
        });

        // Property: the screen has transitioned to `awaiting_otp`. The
        // OtpEntrySection renders an "Enter the OTP" header that no other
        // phase produces.
        await waitFor(() => {
          expect(utils.queryByText(/Enter the OTP/i)).not.toBeNull();
        });

        // Other phases' markers must NOT be present.
        expect(utils.queryByText(/Continue with Truecaller/i)).toBeNull();
        expect(utils.queryByText(/Waiting for missed call/i)).toBeNull();
        expect(utils.queryByText(/Verifying with Upcheck/i)).toBeNull();

        // Property: the displayed TTL countdown initializes from the
        // supplied TTL (post `parseTtl` normalization). OtpEntrySection
        // exposes the countdown via the `OTP expires in {m:ss}`
        // accessibility label, which is read deterministically without
        // relying on free-form rendered text.
        const expectedTtl = parseTtl(event.ttl);
        const expectedLabel = `OTP expires in ${formatTtl(expectedTtl)}`;
        expect(utils.getByLabelText(expectedLabel)).toBeTruthy();

        utils.unmount();
      }),
      { numRuns: 50 },
    );
  });

  test('Property 4b — MISSED_CALL_INITIATED transitions to `awaiting_missed_call` with supplied TTL (Req 8.2)', async () => {
    await fc.assert(
      fc.asyncProperty(missedCallInitiatedEventArb, async (event) => {
        resetAllMocks();
        const utils = render(
          <TruecallerLoginScreen navigation={noopNavigation} />,
        );

        await waitFor(() => {
          expect(eventListeners.length).toBeGreaterThan(0);
        });

        await act(async () => {
          emitTruecallerEvent(event);
        });

        // Property: the screen has transitioned to `awaiting_missed_call`.
        // The "Waiting for missed call" heading is unique to this phase.
        await waitFor(() => {
          expect(
            utils.queryByText(/Waiting for missed call/i),
          ).not.toBeNull();
        });

        // Other phases' markers must NOT be present.
        expect(utils.queryByText(/Continue with Truecaller/i)).toBeNull();
        expect(utils.queryByText(/Enter the OTP/i)).toBeNull();
        expect(utils.queryByText(/Verifying with Upcheck/i)).toBeNull();

        // Property: the displayed TTL countdown initializes from the
        // supplied TTL. The missed-call view renders `Expires in {ttl}s`
        // when the parsed TTL is positive and renders nothing when the
        // parsed TTL is zero (falsy guard in TruecallerLoginScreen.tsx).
        const expectedTtl = parseTtl(event.ttl);
        if (expectedTtl > 0) {
          expect(
            utils.queryByText(new RegExp(`Expires in ${expectedTtl}s`, 'i')),
          ).not.toBeNull();
        } else {
          expect(utils.queryByText(/Expires in/i)).toBeNull();
        }

        utils.unmount();
      }),
      { numRuns: 50 },
    );
  });

  test('Property 4c — for any sequence of `_INITIATED` events, the screen lands in the phase / TTL of the LAST event', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(initiatedEventArb, { minLength: 1, maxLength: 6 }),
        async (sequence) => {
          resetAllMocks();
          const utils = render(
            <TruecallerLoginScreen navigation={noopNavigation} />,
          );

          await waitFor(() => {
            expect(eventListeners.length).toBeGreaterThan(0);
          });

          for (const event of sequence) {
            await act(async () => {
              emitTruecallerEvent(event);
            });
          }

          const last = sequence[sequence.length - 1];
          const expectedTtl = parseTtl(last.ttl);

          if (last.event === 'OTP_INITIATED') {
            await waitFor(() => {
              expect(utils.queryByText(/Enter the OTP/i)).not.toBeNull();
            });
            expect(
              utils.queryByText(/Waiting for missed call/i),
            ).toBeNull();
            const expectedLabel = `OTP expires in ${formatTtl(expectedTtl)}`;
            expect(utils.getByLabelText(expectedLabel)).toBeTruthy();
          } else {
            await waitFor(() => {
              expect(
                utils.queryByText(/Waiting for missed call/i),
              ).not.toBeNull();
            });
            expect(utils.queryByText(/Enter the OTP/i)).toBeNull();
            if (expectedTtl > 0) {
              expect(
                utils.queryByText(
                  new RegExp(`Expires in ${expectedTtl}s`, 'i'),
                ),
              ).not.toBeNull();
            } else {
              expect(utils.queryByText(/Expires in/i)).toBeNull();
            }
          }

          utils.unmount();
        },
      ),
      { numRuns: 25 },
    );
  });
});
