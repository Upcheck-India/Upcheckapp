/**
 * Property test 10.2 — PhoneEntrySection input validation iff schema
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4 (Property 2 from design.md).
 *
 * Property: For any triple `(firstName, lastName, phone)`,
 * `PhoneEntrySection`'s submit handler invokes
 *   `TruecallerAuth.startManualVerification(phone, firstName, lastName)`
 * if and only if
 *   - the trimmed first name length is in `[1, 50]`,
 *   - the last name length is in `[0, 50]` (always true after the
 *     component's `maxLength` clamp), and
 *   - the phone matches `^[6-9]\d{9}$` after the component sanitizes
 *     non-digit characters and clamps to 10 digits.
 * Otherwise the handler displays the corresponding error message
 * ("Please enter your first name" or "Enter a valid 10-digit Indian
 * mobile number") and does NOT invoke `startManualVerification`.
 *
 * The test mounts the real `PhoneEntrySection` and drives it via
 * `@testing-library/react-native`, mocking only `TruecallerAuth` so the
 * native bridge is not exercised.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks — register BEFORE importing the component under test.
// ──────────────────────────────────────────────────────────────────────────────

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

jest.mock('../../../../native/TruecallerAuth', () => ({
  TruecallerAuth: {
    isUsable: jest.fn().mockResolvedValue(false),
    authenticate: jest.fn(),
    startManualVerification: jest.fn(),
    verifyOtp: jest.fn(),
    clear: jest.fn(),
  },
  TruecallerEvents: {
    onEvent: jest.fn(() => ({ remove: jest.fn() })),
  },
  TRUECALLER_EVENT_NAME: 'TruecallerVerificationEvent',
}));

// ──────────────────────────────────────────────────────────────────────────────
// Imports under test — must come AFTER the mocks above.
// ──────────────────────────────────────────────────────────────────────────────

import {
  PhoneEntrySection,
  FIRST_NAME_MAX_LENGTH,
  LAST_NAME_MAX_LENGTH,
  PHONE_NUMBER_LENGTH,
  INDIAN_PHONE_REGEX,
  MESSAGE_INVALID_PHONE,
  MESSAGE_INVALID_FIRST_NAME,
} from '../PhoneEntrySection';
import { TruecallerAuth } from '../../../../native/TruecallerAuth';

const mockStartManualVerification =
  TruecallerAuth.startManualVerification as jest.Mock;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers — mirror the component's input pre-processing exactly so the test
// can predict whether the submit will be accepted for any raw input triple.
// ──────────────────────────────────────────────────────────────────────────────

/** Reproduces `sanitizePhoneInput` from PhoneEntrySection.tsx. */
function sanitizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, PHONE_NUMBER_LENGTH);
}

/** Reproduces the per-field clamps applied by the component's change handlers. */
function clampFirstName(raw: string): string {
  return raw.slice(0, FIRST_NAME_MAX_LENGTH);
}

function clampLastName(raw: string): string {
  return raw.slice(0, LAST_NAME_MAX_LENGTH);
}

interface AcceptanceOutcome {
  /** True iff the component should call `startManualVerification`. */
  shouldAccept: boolean;
  /** Stored first name after the `slice(0, 50)` clamp. */
  storedFirstName: string;
  /** Stored last name after the `slice(0, 50)` clamp. */
  storedLastName: string;
  /** Stored phone number after sanitization (digits only, ≤10 chars). */
  storedPhone: string;
  firstNameOk: boolean;
  phoneOk: boolean;
}

function predictAcceptance(
  rawFirst: string,
  rawLast: string,
  rawPhone: string,
): AcceptanceOutcome {
  const storedFirstName = clampFirstName(rawFirst);
  const storedLastName = clampLastName(rawLast);
  const storedPhone = sanitizePhone(rawPhone);

  const trimmedFirst = storedFirstName.trim();
  const firstNameOk =
    trimmedFirst.length >= 1 && trimmedFirst.length <= FIRST_NAME_MAX_LENGTH;
  // Last name is always within range after the clamp — Requirement 7.1 makes
  // it optional and bounded by `LAST_NAME_MAX_LENGTH` via `maxLength`.
  const lastNameOk = storedLastName.length <= LAST_NAME_MAX_LENGTH;
  const phoneOk = INDIAN_PHONE_REGEX.test(storedPhone);

  return {
    shouldAccept: firstNameOk && lastNameOk && phoneOk,
    storedFirstName,
    storedLastName,
    storedPhone,
    firstNameOk,
    phoneOk,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Generators — partition the input space so each property iteration covers a
// meaningful mix of valid and invalid inputs.
// ──────────────────────────────────────────────────────────────────────────────

/** Always-valid Indian mobile number: 10 digits, leading digit 6/7/8/9. */
const validPhoneArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 6, max: 9 }),
    fc.array(fc.integer({ min: 0, max: 9 }), {
      minLength: 9,
      maxLength: 9,
    }),
  )
  .map(([head, tail]) => `${head}${tail.join('')}`);

/** Phone candidates that span valid, almost-valid, and clearly-invalid shapes. */
const phoneArb: fc.Arbitrary<string> = fc.oneof(
  // Plain valid number.
  validPhoneArb,
  // Valid number with `+91` country-code prefix — sanitization should strip it
  // to 9-only-digit residue, which fails the regex (validates Requirement 7.2
  // wording: a *10-digit* Indian mobile number).
  validPhoneArb.map((p) => `+91${p}`),
  // Valid number with surrounding whitespace / punctuation.
  validPhoneArb.map((p) => ` ${p.slice(0, 5)} ${p.slice(5)} `),
  // Random short digit strings (often <10 digits → invalid).
  fc.string({ minLength: 0, maxLength: 9 }),
  // Random arbitrary strings — typical invalid input.
  fc.string({ minLength: 0, maxLength: 20 }),
  // Numbers with leading digit outside [6-9].
  fc
    .tuple(
      fc.integer({ min: 0, max: 5 }),
      fc.array(fc.integer({ min: 0, max: 9 }), {
        minLength: 9,
        maxLength: 9,
      }),
    )
    .map(([head, tail]) => `${head}${tail.join('')}`),
);

/** First-name candidates spanning valid, whitespace-only, and over-length. */
const firstNameArb: fc.Arbitrary<string> = fc.oneof(
  // Whitespace-only strings → invalid (trim length 0).
  fc.constantFrom('', ' ', '   ', '\t', '\n   ', '   \t '),
  // Typical valid names (1–50 printable ASCII chars after a non-blank prefix).
  fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0),
  // Strings just shy of the limit.
  fc.string({ minLength: 45, maxLength: 60 }),
  // Long strings that exceed the cap — after clamp they may or may not trim
  // to a non-empty string depending on the prefix's whitespace content.
  fc.string({ minLength: 50, maxLength: 80 }),
);

/** Last name is unconstrained beyond the 50-char cap. */
const lastNameArb: fc.Arbitrary<string> = fc.string({
  minLength: 0,
  maxLength: 80,
});

// ──────────────────────────────────────────────────────────────────────────────
// Property test
// ──────────────────────────────────────────────────────────────────────────────

describe('PhoneEntrySection — input validation iff schema (Property 2)', () => {
  beforeEach(() => {
    mockStartManualVerification.mockReset();
    mockStartManualVerification.mockResolvedValue({
      flow: 'OTP_VERIFICATION',
      successful: true,
      accessToken: 'tok',
    });
  });

  test('Submit calls startManualVerification iff inputs match the schema', async () => {
    await fc.assert(
      fc.asyncProperty(
        firstNameArb,
        lastNameArb,
        phoneArb,
        async (rawFirstName, rawLastName, rawPhone) => {
          mockStartManualVerification.mockClear();

          const expected = predictAcceptance(
            rawFirstName,
            rawLastName,
            rawPhone,
          );

          const utils = render(<PhoneEntrySection />);

          const firstNameInput = utils.getByPlaceholderText('Your first name');
          const lastNameInput = utils.getByPlaceholderText('Your last name');
          const phoneInput = utils.getByPlaceholderText('9876543210');

          await act(async () => {
            fireEvent.changeText(firstNameInput, rawFirstName);
            fireEvent.changeText(lastNameInput, rawLastName);
            fireEvent.changeText(phoneInput, rawPhone);
          });

          await act(async () => {
            fireEvent.press(utils.getByText('Send verification code'));
          });

          if (expected.shouldAccept) {
            // Property: bridge invoked with the stored, trimmed values.
            await waitFor(() => {
              expect(mockStartManualVerification).toHaveBeenCalledTimes(1);
            });
            expect(mockStartManualVerification).toHaveBeenCalledWith(
              expected.storedPhone,
              expected.storedFirstName.trim(),
              expected.storedLastName.trim(),
            );
            // No validation error messages should be surfaced.
            expect(utils.queryByText(MESSAGE_INVALID_FIRST_NAME)).toBeNull();
            expect(utils.queryByText(MESSAGE_INVALID_PHONE)).toBeNull();
          } else {
            // Property: bridge NOT invoked, and at least one error message
            // is surfaced for the failing schema check.
            expect(mockStartManualVerification).not.toHaveBeenCalled();

            if (!expected.firstNameOk) {
              expect(
                utils.queryByText(MESSAGE_INVALID_FIRST_NAME),
              ).not.toBeNull();
            }
            if (!expected.phoneOk) {
              expect(utils.queryByText(MESSAGE_INVALID_PHONE)).not.toBeNull();
            }
          }

          utils.unmount();
        },
      ),
      { numRuns: 50 },
    );
  });
});
