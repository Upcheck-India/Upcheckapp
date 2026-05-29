/**
 * Property test 10.11 — "Sign in with email" link reachable from every phase
 *
 * Validates: Requirements 12.5 (Property 11 from design.md).
 *
 * Property: For any phase ∈ { idle, manual, awaiting_otp,
 * awaiting_missed_call, verifying }, the rendered TruecallerLoginScreen
 * contains a tappable element labeled "Sign in with email" whose `onPress`
 * navigates to the existing email login screen (route name `Login`).
 *
 * The phase set is small and fully enumerable, so fast-check's role here is
 * to drive a deterministic enumeration plus light shuffling — 25 runs is
 * more than enough to cover all 5 phases multiple times.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks — heavy modules are replaced with minimal fakes so the screen can be
// driven through every phase without touching real native code, real HTTP,
// real auth-store persistence, or real permission prompts.
// ──────────────────────────────────────────────────────────────────────────────

const eventListeners: Array<(event: unknown) => void> = [];
const emitTruecallerEvent = (event: unknown): void => {
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
  requestTruecallerPermissions: (...args: unknown[]) =>
    mockRequestTruecallerPermissions(...args),
}));

const mockApiPost = jest.fn();

jest.mock('../../../api/client', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

const mockSetSession = jest.fn();

jest.mock('../../../store/authStore', () => ({
  __esModule: true,
  useAuthStore: (
    selector: (state: { setSession: typeof mockSetSession }) => unknown,
  ) => selector({ setSession: mockSetSession }),
}));

// Quiet React Native's Alert during property runs — we never want a stray
// alert dialog to interfere with rendering or with element queries.
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Stub `react-native-safe-area-context` so `OfflineIndicator` (rendered via
// `ScreenWrapper`) doesn't throw "No safe area value available" when the
// screen is mounted outside a `SafeAreaProvider`. The Truecaller screen does
// not consume insets directly; the provider is purely an environmental
// concern owned by the app shell.
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
// Phase enumeration
// ──────────────────────────────────────────────────────────────────────────────

const PHASES = [
  'idle',
  'manual',
  'awaiting_otp',
  'awaiting_missed_call',
  'verifying',
] as const;
type Phase = (typeof PHASES)[number];

const phaseArb: fc.Arbitrary<Phase> = fc.constantFrom(...PHASES);

const EMAIL_LOGIN_ROUTE = 'Login';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

interface MockNavigation {
  navigate: jest.Mock;
  replace: jest.Mock;
  goBack: jest.Mock;
}

function makeNavigation(): MockNavigation {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
  };
}

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
}

/**
 * Drive the screen into the requested phase. The transitions mirror the
 * FSM in `TruecallerLoginScreen.tsx`:
 *
 *   - idle:                  initial mount, no actions required
 *   - manual:                press "Continue with Truecaller" with the
 *                            One-Tap call resolving to VERIFICATION_REQUIRED
 *   - awaiting_otp:          emit OTP_INITIATED on the events channel
 *   - awaiting_missed_call:  emit MISSED_CALL_INITIATED on the events channel
 *   - verifying:             emit VERIFICATION_COMPLETE while the backend
 *                            POST is held pending (apiPost returns a
 *                            never-resolving promise so phase stays put)
 */
async function driveToPhase(
  phase: Phase,
  utils: ReturnType<typeof render>,
): Promise<void> {
  const { getByText } = utils;

  switch (phase) {
    case 'idle':
      // Initial render is already idle — nothing to do.
      return;

    case 'manual':
      mockAuthenticate.mockResolvedValueOnce({
        flow: 'VERIFICATION_REQUIRED',
        successful: false,
        error: 'ERROR_VERIFICATION_REQUIRED',
      });
      await act(async () => {
        fireEvent.press(getByText(/Continue with Truecaller/i));
      });
      return;

    case 'awaiting_otp':
      // Wait for the events listener to be wired up by the effect.
      await waitFor(() => {
        expect(eventListeners.length).toBeGreaterThan(0);
      });
      await act(async () => {
        emitTruecallerEvent({ event: 'OTP_INITIATED', ttl: '60' });
      });
      return;

    case 'awaiting_missed_call':
      await waitFor(() => {
        expect(eventListeners.length).toBeGreaterThan(0);
      });
      await act(async () => {
        emitTruecallerEvent({ event: 'MISSED_CALL_INITIATED', ttl: '60' });
      });
      return;

    case 'verifying':
      // Hold apiPost pending so phase stays at "verifying" for the duration
      // of the assertion. The promise is intentionally never resolved; the
      // test unmounts the component at the end of each iteration.
      mockApiPost.mockReset();
      mockApiPost.mockReturnValue(new Promise(() => {}));
      await waitFor(() => {
        expect(eventListeners.length).toBeGreaterThan(0);
      });
      await act(async () => {
        emitTruecallerEvent({
          event: 'VERIFICATION_COMPLETE',
          accessToken: 'pending-token',
        });
      });
      // Wait for sendToBackend to fire, which is what flips phase to
      // 'verifying' before the (pending) POST resolves.
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledTimes(1);
      });
      return;
  }
}

/**
 * Cheap structural check that the requested phase is the one currently
 * rendered. Each phase has a uniquely-rendered marker:
 *   - idle:                  "Continue with Truecaller" button
 *   - manual:                "First name, required" input label
 *   - awaiting_otp:          "Enter OTP, required" input label
 *   - awaiting_missed_call:  "Waiting for missed call" heading
 *   - verifying:             "Verifying with Upcheck..." text
 *
 * The check guards against regressions in the driver helper above: if a
 * phase transition silently fails the marker won't be present, and the
 * email-link assertion below would otherwise be testing the wrong phase.
 */
function expectPhaseRendered(
  phase: Phase,
  utils: ReturnType<typeof render>,
): void {
  const { queryByText, queryByLabelText } = utils;
  switch (phase) {
    case 'idle':
      expect(queryByText(/Continue with Truecaller/i)).not.toBeNull();
      return;
    case 'manual':
      expect(queryByLabelText(/First name, required/i)).not.toBeNull();
      return;
    case 'awaiting_otp':
      // OtpEntrySection renders a heading containing the unique phrase
      // "verification code". Avoid matching `/OTP/` because the section
      // uses that token in multiple places (input label, "Resend OTP" CTA),
      // which would make `queryByText` throw on multiple matches.
      expect(utils.queryByText(/verification code/i)).not.toBeNull();
      return;
    case 'awaiting_missed_call':
      expect(queryByText(/Waiting for missed call/i)).not.toBeNull();
      return;
    case 'verifying':
      expect(queryByText(/Verifying with Upcheck/i)).not.toBeNull();
      return;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Property test
// ──────────────────────────────────────────────────────────────────────────────

describe('TruecallerLoginScreen — "Sign in with email" link reachable from every phase (Property 11)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('Property 11 — every phase renders a tappable email-login link that navigates to Login', async () => {
    await fc.assert(
      fc.asyncProperty(phaseArb, async (phase) => {
        resetAllMocks();
        const navigation = makeNavigation();
        const utils = render(
          <TruecallerLoginScreen navigation={navigation} />,
        );

        await driveToPhase(phase, utils);
        expectPhaseRendered(phase, utils);

        // Property: the link is present in the tree from every phase.
        const link = utils.getByLabelText('Sign in with email');
        expect(link).not.toBeNull();

        // Property: tapping it navigates to the email login route.
        await act(async () => {
          fireEvent.press(link);
        });
        expect(navigation.navigate).toHaveBeenCalledWith(EMAIL_LOGIN_ROUTE);

        utils.unmount();
      }),
      { numRuns: 25 },
    );
  });

  // Companion deterministic check: enumerate all 5 phases at least once. fast
  // -check's `constantFrom` will visit every phase with high probability over
  // 25 runs, but spelling it out makes a regression that drops a phase
  // (e.g. forgetting to render the link during `verifying`) a guaranteed
  // failure rather than a flaky one.
  test.each(PHASES)(
    'phase=%s renders the email-login link and navigates to Login on press',
    async (phase) => {
      resetAllMocks();
      const navigation = makeNavigation();
      const utils = render(<TruecallerLoginScreen navigation={navigation} />);

      await driveToPhase(phase, utils);
      expectPhaseRendered(phase, utils);

      const link = utils.getByLabelText('Sign in with email');
      expect(link).not.toBeNull();

      await act(async () => {
        fireEvent.press(link);
      });
      expect(navigation.navigate).toHaveBeenCalledWith(EMAIL_LOGIN_ROUTE);

      utils.unmount();
    },
  );
});
