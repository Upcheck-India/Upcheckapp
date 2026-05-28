/**
 * Task 11.3 — TruecallerLoginScreen phase-transition integration test
 *
 * Validates: Requirements 6.4, 8.1, 8.2, 8.4, 12.4.
 *
 * Drives the screen end-to-end through the OTP fallback flow using example-
 * based assertions (this is the integration test for task 11.3 — the
 * property tests in `TruecallerLoginScreen.events.property.test.tsx` and
 * `TruecallerLoginScreen.dispatch.property.test.tsx` cover the universal
 * properties; this file pins the specific happy-path / failure-path traces
 * that match the design-doc trace narrative).
 *
 * The mocks below mirror the pattern established by the property tests
 * (controllable `TruecallerEvents` listener list, mocked `TruecallerAuth`,
 * mocked `apiClient`, mocked `useAuthStore`, stub
 * `react-native-safe-area-context`, etc.) so the screen mounts in isolation
 * without touching any real native code, HTTP, persistence, or permissions.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks — heavy modules are replaced with minimal fakes so the integration
// test can drive the screen's FSM directly.
// ──────────────────────────────────────────────────────────────────────────────

const eventListeners: Array<(event: unknown) => void> = [];
const emitTruecallerEvent = (event: unknown): void => {
  // Iterate over a snapshot so listeners that unsubscribe during dispatch
  // do not perturb iteration.
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

// Spy on Alert.alert so the failure-path assertion can read the arguments
// without crashing the test runner when no listeners are wired.
import { Alert } from 'react-native';
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {
  // Intentional no-op; tests inspect calls directly.
});

// Stub `react-native-safe-area-context` so the screen mounts without a real
// SafeAreaProvider tree.
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

// Replace the OfflineIndicator with a no-op so the screen tree is minimal.
jest.mock('../../../components/ui/OfflineIndicator', () => ({
  __esModule: true,
  OfflineIndicator: () => null,
}));

// Replace MaterialCommunityIcons with a noop component to avoid font loading
// inside react-test-renderer.
jest.mock('@expo/vector-icons', () => ({
  __esModule: true,
  MaterialCommunityIcons: () => null,
}));

// ──────────────────────────────────────────────────────────────────────────────
// Imports — must come after the mocks above.
// ──────────────────────────────────────────────────────────────────────────────

import { TruecallerLoginScreen } from '../TruecallerLoginScreen';

// ──────────────────────────────────────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────────────────────────────────────

const TRUECALLER_OAUTH_PATH = '/auth/supabase/oauth/truecaller';

const noopNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

const fakeSession = {
  access_token: 'srv-access-token',
  refresh_token: 'srv-refresh-token',
  expires_in: 3600,
  token_type: 'bearer' as const,
  user: { id: 'srv-user-id' },
};

function resetAllMocks(): void {
  eventListeners.length = 0;
  mockAuthenticate.mockReset();
  mockStartManualVerification.mockReset();
  mockVerifyOtp.mockReset();
  mockClear.mockReset();
  mockApiPost.mockReset();
  // Default to a 200 response with a session so the success branch in
  // sendToBackend hits setSession; individual tests can override.
  mockApiPost.mockResolvedValue({
    data: {
      message: 'ok',
      user: { id: 'srv-user-id' },
      session: fakeSession,
    },
  });
  mockRequestTruecallerPermissions.mockReset();
  mockRequestTruecallerPermissions.mockResolvedValue({
    granted: true,
    deniedPermissions: [],
  });
  mockSetSession.mockReset();
  alertSpy.mockClear();
  noopNavigation.navigate.mockReset();
  noopNavigation.replace.mockReset();
  noopNavigation.goBack.mockReset();
}

function renderScreen() {
  return render(<TruecallerLoginScreen navigation={noopNavigation} />);
}

// ──────────────────────────────────────────────────────────────────────────────
// Integration tests
// ──────────────────────────────────────────────────────────────────────────────

describe('TruecallerLoginScreen — phase transitions integration (task 11.3)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('happy path — OTP_INITIATED → OTP_RECEIVED → VERIFICATION_COMPLETE → setSession', async () => {
    // Use a short TTL so the OtpEntrySection countdown does not dominate
    // wall-clock time. The screen reads `ttl` from the event verbatim and
    // initializes a 1-second-tick interval; long TTLs (e.g. the realistic
    // "60" the SDK delivers) cause the countdown's setInterval to re-render
    // the section repeatedly during this test, slowing waitFor polling.
    // The transition logic is identical for any positive TTL — the design
    // requirement (8.1) is "initialize from the supplied ttl", not a
    // specific value — so using a short TTL keeps the test fast without
    // weakening the assertion. The property tests in
    // TruecallerLoginScreen.events.property.test.tsx exercise arbitrary
    // TTL values across the full SDK domain.
    const ttlSeconds = 2;
    // Arrange: One-Tap returns VERIFICATION_REQUIRED so the screen falls
    // through to PhoneEntrySection (Req 6.4). PhoneEntrySection's submit
    // awaits a successful resolution from startManualVerification before
    // returning control; the events channel then drives the rest.
    mockAuthenticate.mockResolvedValueOnce({
      flow: 'VERIFICATION_REQUIRED',
      successful: false,
      error: 'ERROR_VERIFICATION_REQUIRED',
    });
    mockStartManualVerification.mockResolvedValueOnce({
      flow: 'OTP_VERIFICATION',
      successful: true,
    });

    const utils = renderScreen();

    // Wait for the screen's events subscription to be installed by the
    // initial effect — every later assertion depends on the listener
    // existing so emitTruecallerEvent has somewhere to deliver to.
    await waitFor(() => {
      expect(eventListeners.length).toBeGreaterThan(0);
    });

    // ── Step 1: tap "Continue with Truecaller" → VERIFICATION_REQUIRED →
    //    phase=manual (Req 6.4).
    await act(async () => {
      fireEvent.press(utils.getByText(/Continue with Truecaller/i));
    });

    await waitFor(() => {
      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    });

    // PhoneEntrySection's "Verify your phone number" header is unique to
    // the manual phase, so its presence confirms the FSM transition.
    await waitFor(() => {
      expect(utils.queryByText(/Verify your phone number/i)).not.toBeNull();
    });

    // ── Step 2: fill PhoneEntrySection and submit. The submit handler calls
    //    TruecallerAuth.startManualVerification(phone, firstName, lastName).
    const firstName = 'Aanya';
    const lastName = 'Sharma';
    const phone10 = '9876543210';

    await act(async () => {
      fireEvent.changeText(
        utils.getByLabelText(/First name, required/i),
        firstName,
      );
      fireEvent.changeText(
        utils.getByLabelText(/Last name, optional/i),
        lastName,
      );
      fireEvent.changeText(
        utils.getByLabelText(/10 digit Indian mobile number, required/i),
        phone10,
      );
    });

    await act(async () => {
      fireEvent.press(utils.getByText(/Send verification code/i));
    });

    await waitFor(() => {
      expect(mockStartManualVerification).toHaveBeenCalledTimes(1);
    });
    expect(mockStartManualVerification).toHaveBeenCalledWith(
      phone10,
      firstName,
      lastName,
    );

    // ── Step 3: emit OTP_INITIATED { ttl } → phase=awaiting_otp (Req 8.1).
    //    OtpEntrySection's "Enter the OTP" header is unique to this phase.
    await act(async () => {
      emitTruecallerEvent({
        event: 'OTP_INITIATED',
        ttl: String(ttlSeconds),
      });
    });

    await waitFor(() => {
      expect(utils.queryByText(/Enter the OTP/i)).not.toBeNull();
    });
    // The TTL countdown initializes from the supplied value. The label uses
    // OtpEntrySection's `m:ss` formatter, so a 2-second TTL renders as
    // "0:02"; this asserts initialization from `event.ttl` per Req 8.1.
    expect(utils.getByLabelText('OTP expires in 0:02')).toBeTruthy();
    // Phase mutex: the previous phases' markers must be gone.
    expect(utils.queryByText(/Verify your phone number/i)).toBeNull();

    // ── Step 4: emit OTP_RECEIVED { otp: '123456' } → OtpEntrySection
    //    auto-fills its input (Req 8.4).
    await act(async () => {
      emitTruecallerEvent({ event: 'OTP_RECEIVED', otp: '123456' });
    });

    await waitFor(() => {
      expect(utils.queryByDisplayValue('123456')).not.toBeNull();
    });

    // ── Step 5: emit VERIFICATION_COMPLETE { accessToken: 'tok' } → the
    //    screen POSTs { accessToken, phoneNumber, firstName, lastName }
    //    to /auth/supabase/oauth/truecaller (Req 8.5 — covered here as
    //    the dispatch consequence of the phase transition).
    await act(async () => {
      emitTruecallerEvent({
        event: 'VERIFICATION_COMPLETE',
        accessToken: 'tok',
      });
    });

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledTimes(1);
    });

    const [path, body] = mockApiPost.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(path).toBe(TRUECALLER_OAUTH_PATH);
    expect(body).toEqual({
      accessToken: 'tok',
      phoneNumber: `+91${phone10}`,
      firstName,
      lastName,
    });

    // ── Step 6: 200 response → setSession is called with the server
    //    session (Req 6.3 / 11.5 — the integration verifies the ultimate
    //    side-effect that drives the navigator switch to authenticated).
    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledTimes(1);
    });
    expect(mockSetSession).toHaveBeenCalledWith(fakeSession);

    utils.unmount();
  });

  test('failure path — VERIFICATION_FAILED returns to manual phase and surfaces exceptionMessage (Req 12.4)', async () => {
    // Arrive at phase=awaiting_otp first so the failure transition has a
    // distinct "before" / "after" to assert against.
    mockAuthenticate.mockResolvedValueOnce({
      flow: 'VERIFICATION_REQUIRED',
      successful: false,
      error: 'ERROR_VERIFICATION_REQUIRED',
    });
    mockStartManualVerification.mockResolvedValueOnce({
      flow: 'OTP_VERIFICATION',
      successful: true,
    });

    const utils = renderScreen();

    await waitFor(() => {
      expect(eventListeners.length).toBeGreaterThan(0);
    });

    await act(async () => {
      fireEvent.press(utils.getByText(/Continue with Truecaller/i));
    });

    await waitFor(() => {
      expect(utils.queryByText(/Verify your phone number/i)).not.toBeNull();
    });

    await act(async () => {
      fireEvent.changeText(
        utils.getByLabelText(/First name, required/i),
        'Bilal',
      );
      fireEvent.changeText(
        utils.getByLabelText(/10 digit Indian mobile number, required/i),
        '9123456780',
      );
    });
    await act(async () => {
      fireEvent.press(utils.getByText(/Send verification code/i));
    });

    await act(async () => {
      emitTruecallerEvent({ event: 'OTP_INITIATED', ttl: '60' });
    });

    await waitFor(() => {
      expect(utils.queryByText(/Enter the OTP/i)).not.toBeNull();
    });

    // Now emit VERIFICATION_FAILED. The screen surfaces exceptionMessage
    // via Alert.alert and resets phase to `manual` (Req 12.4).
    await act(async () => {
      emitTruecallerEvent({
        event: 'VERIFICATION_FAILED',
        exceptionCode: 7,
        exceptionMessage: 'BAD',
      });
    });

    // Alert was invoked with the exception message preserved verbatim.
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });
    const [alertTitle, alertMessage] = alertSpy.mock.calls[0] as [
      string,
      string,
    ];
    expect(alertTitle).toMatch(/Verification failed/i);
    expect(alertMessage).toBe('BAD');

    // Phase has returned to `manual` (PhoneEntrySection re-rendered).
    await waitFor(() => {
      expect(utils.queryByText(/Verify your phone number/i)).not.toBeNull();
    });
    // OtpEntrySection should be torn down again.
    expect(utils.queryByText(/Enter the OTP/i)).toBeNull();

    // No backend POST should have been issued for a failed verification.
    expect(mockApiPost).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();

    utils.unmount();
  });

  test('MISSED_CALL_INITIATED transitions to awaiting_missed_call with TTL (Req 8.2)', async () => {
    // Arrive at phase=manual via the One-Tap fall-through, then exercise
    // the missed-call branch directly (the SDK alternates between OTP and
    // missed-call delivery channels at runtime).
    mockAuthenticate.mockResolvedValueOnce({
      flow: 'VERIFICATION_REQUIRED',
      successful: false,
      error: 'ERROR_VERIFICATION_REQUIRED',
    });
    mockStartManualVerification.mockResolvedValueOnce({
      flow: 'OTP_VERIFICATION',
      successful: true,
    });

    const utils = renderScreen();

    await waitFor(() => {
      expect(eventListeners.length).toBeGreaterThan(0);
    });

    await act(async () => {
      fireEvent.press(utils.getByText(/Continue with Truecaller/i));
    });

    await waitFor(() => {
      expect(utils.queryByText(/Verify your phone number/i)).not.toBeNull();
    });

    await act(async () => {
      fireEvent.changeText(
        utils.getByLabelText(/First name, required/i),
        'Charu',
      );
      fireEvent.changeText(
        utils.getByLabelText(/10 digit Indian mobile number, required/i),
        '9988776655',
      );
    });
    await act(async () => {
      fireEvent.press(utils.getByText(/Send verification code/i));
    });

    await act(async () => {
      emitTruecallerEvent({ event: 'MISSED_CALL_INITIATED', ttl: '30' });
    });

    // The "Waiting for missed call" heading is unique to the
    // awaiting_missed_call phase, and the body shows the TTL countdown.
    await waitFor(() => {
      expect(utils.queryByText(/Waiting for missed call/i)).not.toBeNull();
    });
    expect(utils.queryByText(/Expires in 30s/i)).not.toBeNull();
    expect(utils.queryByText(/Enter the OTP/i)).toBeNull();

    utils.unmount();
  });
});
