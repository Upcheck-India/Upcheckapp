/**
 * Property test 10.5 — Backend dispatch carries correct fields per active flow
 *
 * Validates: Requirements 6.2, 8.5, 8.6 (Property 5 from design.md).
 *
 * For any successful client-side authentication outcome, the JSON body POSTed
 * to `/auth/supabase/oauth/truecaller` contains exactly:
 *   - One-Tap result: `payload`, `signature`, `signatureAlgorithm`,
 *     `requestNonce`, `phoneNumber`, `firstName`, `lastName`.
 *   - PROFILE_VERIFIED_BEFORE event: `payload`, `signature`,
 *     `signatureAlgorithm`, `requestNonce`, `phoneNumber`, `firstName`,
 *     `lastName`.
 *   - VERIFICATION_COMPLETE event: `accessToken`, `phoneNumber`, `firstName`,
 *     `lastName`.
 *
 * The fields' values equal the corresponding fields on the SDK input.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks — heavy modules are replaced with minimal fakes so the dispatch logic
// can be exercised in isolation (no real native module, no real HTTP, no
// real auth store, no real permissions prompt).
// ──────────────────────────────────────────────────────────────────────────────

const eventListeners: Array<(event: unknown) => void> = [];
const emitTruecallerEvent = (event: unknown): void => {
  // Iterate over a snapshot so listeners that unsubscribe during dispatch
  // don't perturb iteration.
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
  useAuthStore: (selector: (state: { setSession: typeof mockSetSession }) => unknown) =>
    selector({ setSession: mockSetSession }),
}));

// Quiet React Native's Alert dialog calls during property runs without
// fully re-mocking the `react-native` module (which would force every
// lazy-loaded native module to load). Instead, patch the Alert reference
// once before tests run so failure paths don't crash the test runner.
import { Alert } from 'react-native';
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {
  // Intentional no-op for tests.
});

// Replace the safe-area-context with a stub so the screen can render outside
// a real SafeAreaProvider tree (the test only cares about dispatch logic).
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
// Generators
// ──────────────────────────────────────────────────────────────────────────────

const TRUECALLER_OAUTH_PATH = '/auth/supabase/oauth/truecaller';
const DEFAULT_SIGNATURE_ALGORITHM = 'SHA512withRSA';

/** Indian-mobile generator constrained to the schema in PhoneEntrySection. */
const indianPhoneArb = fc
  .tuple(
    fc.constantFrom('6', '7', '8', '9'),
    fc.stringMatching(/^\d{9}$/),
  )
  .map(([lead, rest]) => `${lead}${rest}`);

const firstNameArb = fc
  .string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
  .filter((s) => s.trim().length > 0)
  .filter((s) => /^[\x20-\x7E]+$/.test(s));
const lastNameArb = fc
  .string({ minLength: 0, maxLength: 50, unit: 'grapheme-ascii' })
  .filter((s) => /^[\x20-\x7E]*$/.test(s));

/** Non-empty printable ASCII for opaque token-shaped strings. */
const tokenStringArb = fc
  .string({ minLength: 1, maxLength: 64, unit: 'grapheme-ascii' })
  .filter((s) => /^[\x20-\x7E]+$/.test(s));

const oneTapSuccessArb = fc.record({
  flow: fc.constant('ONE_TAP' as const),
  successful: fc.constant(true as const),
  firstName: firstNameArb,
  lastName: lastNameArb,
  phoneNumber: indianPhoneArb.map((p) => `+91${p}`),
  countryCode: fc.constant('IN'),
  email: fc.constant(''),
  isVerified: fc.boolean(),
  payload: tokenStringArb,
  signature: tokenStringArb,
  signatureAlgorithm: fc.constantFrom('SHA512withRSA', 'SHA256withRSA'),
  requestNonce: tokenStringArb,
});

const profileVerifiedBeforeEventArb = fc.record({
  event: fc.constant('PROFILE_VERIFIED_BEFORE' as const),
  firstName: firstNameArb,
  lastName: lastNameArb,
  phoneNumber: indianPhoneArb.map((p) => `+91${p}`),
  payload: tokenStringArb,
  signature: tokenStringArb,
  requestNonce: tokenStringArb,
});

const verificationCompleteArb = fc.record({
  event: fc.constant('VERIFICATION_COMPLETE' as const),
  accessToken: tokenStringArb,
});

// ──────────────────────────────────────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────────────────────────────────────

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
  // Resolve with a fake session so the success branch in `sendToBackend`
  // hits `setSession(data.session)` rather than the "No session returned"
  // alert path. The test only asserts on the request body, so the response
  // shape just needs `session` to be truthy.
  mockApiPost.mockResolvedValue({
    data: {
      message: 'ok',
      user: { id: 'fake-user' },
      session: {
        access_token: 'fake-access',
        refresh_token: 'fake-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'fake-user' },
      },
    },
  });
  mockRequestTruecallerPermissions.mockReset();
  mockRequestTruecallerPermissions.mockResolvedValue({ granted: true, deniedPermissions: [] });
  mockSetSession.mockReset();
  noopNavigation.navigate.mockReset();
  noopNavigation.replace.mockReset();
  noopNavigation.goBack.mockReset();
}

/** Render the screen and return helpers. */
function renderScreen() {
  const utils = render(<TruecallerLoginScreen navigation={noopNavigation} />);
  return utils;
}

// ──────────────────────────────────────────────────────────────────────────────
// Property 5a — One-Tap result dispatches the signed-payload body
// ──────────────────────────────────────────────────────────────────────────────

describe('TruecallerLoginScreen — backend dispatch shape (Property 5)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('Property 5a — One-Tap success POSTs signed-payload fields (Req 6.2)', async () => {
    await fc.assert(
      fc.asyncProperty(oneTapSuccessArb, async (oneTap) => {
        resetAllMocks();
        mockAuthenticate.mockResolvedValueOnce(oneTap);

        const { getByText, unmount } = renderScreen();

        await act(async () => {
          fireEvent.press(getByText(/Continue with Truecaller/i));
        });

        await waitFor(() => {
          expect(mockApiPost).toHaveBeenCalledTimes(1);
        });

        const [path, body] = mockApiPost.mock.calls[0] as [string, Record<string, unknown>];
        expect(path).toBe(TRUECALLER_OAUTH_PATH);

        // Property: body keys are exactly the One-Tap dispatch fields.
        expect(new Set(Object.keys(body))).toEqual(
          new Set([
            'payload',
            'signature',
            'signatureAlgorithm',
            'requestNonce',
            'phoneNumber',
            'firstName',
            'lastName',
          ]),
        );

        // Property: each field's value equals the SDK input.
        expect(body.payload).toBe(oneTap.payload);
        expect(body.signature).toBe(oneTap.signature);
        expect(body.signatureAlgorithm).toBe(oneTap.signatureAlgorithm);
        expect(body.requestNonce).toBe(oneTap.requestNonce);
        expect(body.phoneNumber).toBe(oneTap.phoneNumber);
        expect(body.firstName).toBe(oneTap.firstName);
        expect(body.lastName).toBe(oneTap.lastName);

        unmount();
      }),
      { numRuns: 25 },
    );
  });

  test('Property 5b — PROFILE_VERIFIED_BEFORE POSTs signed-payload fields (Req 8.6)', async () => {
    await fc.assert(
      fc.asyncProperty(profileVerifiedBeforeEventArb, async (event) => {
        resetAllMocks();

        const { unmount } = renderScreen();

        // Wait for the event subscription to be installed.
        await waitFor(() => {
          expect(eventListeners.length).toBeGreaterThan(0);
        });

        await act(async () => {
          emitTruecallerEvent(event);
        });

        await waitFor(() => {
          expect(mockApiPost).toHaveBeenCalledTimes(1);
        });

        const [path, body] = mockApiPost.mock.calls[0] as [string, Record<string, unknown>];
        expect(path).toBe(TRUECALLER_OAUTH_PATH);

        // Property: body keys are exactly the PROFILE_VERIFIED_BEFORE
        // dispatch fields. The screen synthesizes signatureAlgorithm from
        // DEFAULT_SIGNATURE_ALGORITHM since the SDK omits it on this event.
        expect(new Set(Object.keys(body))).toEqual(
          new Set([
            'payload',
            'signature',
            'signatureAlgorithm',
            'requestNonce',
            'phoneNumber',
            'firstName',
            'lastName',
          ]),
        );

        expect(body.payload).toBe(event.payload);
        expect(body.signature).toBe(event.signature);
        expect(body.signatureAlgorithm).toBe(DEFAULT_SIGNATURE_ALGORITHM);
        expect(body.requestNonce).toBe(event.requestNonce);
        expect(body.phoneNumber).toBe(event.phoneNumber);
        expect(body.firstName).toBe(event.firstName);
        expect(body.lastName).toBe(event.lastName);

        unmount();
      }),
      { numRuns: 25 },
    );
  });

  test('Property 5c — VERIFICATION_COMPLETE POSTs access-token fields (Req 8.5)', async () => {
    await fc.assert(
      fc.asyncProperty(
        verificationCompleteArb,
        firstNameArb,
        lastNameArb,
        indianPhoneArb,
        async (vcEvent, firstName, lastName, phone10) => {
          resetAllMocks();

          // Drive through One-Tap → VERIFICATION_REQUIRED so the screen
          // transitions to phase=manual and reveals PhoneEntrySection.
          mockAuthenticate.mockResolvedValueOnce({
            flow: 'VERIFICATION_REQUIRED',
            successful: false,
            error: 'ERROR_VERIFICATION_REQUIRED',
          });
          // PhoneEntrySection.onSubmit awaits this resolution.
          mockStartManualVerification.mockResolvedValueOnce({
            flow: 'OTP_VERIFICATION',
            successful: true,
          });

          const { getByText, getByLabelText, unmount } = renderScreen();

          // Step 1: tap "Continue with Truecaller" → phase = manual.
          await act(async () => {
            fireEvent.press(getByText(/Continue with Truecaller/i));
          });

          // Step 2: fill PhoneEntrySection and submit so the screen captures
          // {firstName, lastName, phoneNumber} into manualValuesRef.
          await waitFor(() => {
            expect(getByLabelText(/First name, required/i)).toBeTruthy();
          });

          await act(async () => {
            fireEvent.changeText(getByLabelText(/First name, required/i), firstName);
            fireEvent.changeText(getByLabelText(/Last name, optional/i), lastName);
            fireEvent.changeText(
              getByLabelText(/10 digit Indian mobile number, required/i),
              phone10,
            );
          });

          await act(async () => {
            fireEvent.press(getByText(/Send verification code/i));
          });

          await waitFor(() => {
            expect(mockStartManualVerification).toHaveBeenCalledTimes(1);
          });

          // Step 3: emit VERIFICATION_COMPLETE.
          await act(async () => {
            emitTruecallerEvent(vcEvent);
          });

          await waitFor(() => {
            expect(mockApiPost).toHaveBeenCalledTimes(1);
          });

          const [path, body] = mockApiPost.mock.calls[0] as [
            string,
            Record<string, unknown>,
          ];
          expect(path).toBe(TRUECALLER_OAUTH_PATH);

          // Property: body keys are exactly the VERIFICATION_COMPLETE
          // dispatch fields.
          expect(new Set(Object.keys(body))).toEqual(
            new Set(['accessToken', 'phoneNumber', 'firstName', 'lastName']),
          );

          // Values equal the SDK / user inputs (firstName/lastName are
          // trimmed by PhoneEntrySection before hitting the dispatcher).
          expect(body.accessToken).toBe(vcEvent.accessToken);
          expect(body.phoneNumber).toBe(`+91${phone10}`);
          expect(body.firstName).toBe(firstName.trim());
          expect(body.lastName).toBe(lastName.trim());

          unmount();
        },
      ),
      { numRuns: 15 },
    );
  });
});
