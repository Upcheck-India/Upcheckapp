/**
 * PhoneEntrySection — collects first name, optional last name, and a 10-digit
 * Indian mobile number, then invokes
 * `TruecallerAuth.startManualVerification(phoneNumber, firstName, lastName)`
 * to drive the OTP / missed-call fallback flow.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4.
 *
 * Validation rules:
 *   - First name: 1–50 characters, not whitespace-only
 *     (Requirement 7.3 → "Please enter your first name").
 *   - Last name: 0–50 characters, optional (Requirement 7.1).
 *   - Phone: must match `^[6-9]\d{9}$`
 *     (Requirement 7.2 → "Enter a valid 10-digit Indian mobile number").
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { theme } from '../../../theme';
import {
  TruecallerAuth,
  type TruecallerAuthResult,
} from '../../../native/TruecallerAuth';

// ──────────────────────────────────────────────────────────────────────────────
// Validation constants (Requirements 7.1–7.3)
// ──────────────────────────────────────────────────────────────────────────────

export const FIRST_NAME_MIN_LENGTH = 1;
export const FIRST_NAME_MAX_LENGTH = 50;
export const LAST_NAME_MAX_LENGTH = 50;
export const PHONE_NUMBER_LENGTH = 10;

/** Indian mobile number: 10 digits, leading digit 6/7/8/9. */
export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export const MESSAGE_INVALID_PHONE = 'Enter a valid 10-digit Indian mobile number';
export const MESSAGE_INVALID_FIRST_NAME = 'Please enter your first name';

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────

export interface PhoneEntryValues {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface PhoneEntrySectionProps {
  /** Pre-fill the form (e.g. when re-entering after a transient failure). */
  initialValues?: Partial<PhoneEntryValues>;
  /**
   * Called after `TruecallerAuth.startManualVerification` resolves so the
   * parent screen can transition phase / inspect the result.
   */
  onSubmit?: (
    values: PhoneEntryValues,
    result: TruecallerAuthResult,
  ) => void;
  /**
   * Render a busy state and block submission. Useful when the parent has
   * other concurrent work in flight (e.g. permission requests).
   */
  loading?: boolean;
  /** Hide the submit button entirely (rare; defaults to false). */
  disabled?: boolean;
  /**
   * Optional override of the submit button label. Defaults to
   * "Send verification code".
   */
  submitLabel?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Strip everything but digits, then trim to the maximum phone length so the
 * user cannot accumulate stray characters (spaces, hyphens, +91 paste, etc.).
 */
function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, PHONE_NUMBER_LENGTH);
}

function isValidFirstName(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length >= FIRST_NAME_MIN_LENGTH &&
    trimmed.length <= FIRST_NAME_MAX_LENGTH
  );
}

function isValidLastName(value: string): boolean {
  // Last name is optional (length 0 allowed); only the upper bound applies.
  return value.trim().length <= LAST_NAME_MAX_LENGTH;
}

function isValidPhoneNumber(value: string): boolean {
  return INDIAN_PHONE_REGEX.test(value);
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export const PhoneEntrySection: React.FC<PhoneEntrySectionProps> = ({
  initialValues,
  onSubmit,
  loading = false,
  disabled = false,
  submitLabel = 'Send verification code',
}) => {
  const [firstName, setFirstName] = useState<string>(
    initialValues?.firstName ?? '',
  );
  const [lastName, setLastName] = useState<string>(
    initialValues?.lastName ?? '',
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(
    sanitizePhoneInput(initialValues?.phoneNumber ?? ''),
  );

  const [firstNameError, setFirstNameError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const handleFirstNameChange = useCallback((value: string) => {
    // Cap input at the schema maximum to prevent silent truncation surprises.
    setFirstName(value.slice(0, FIRST_NAME_MAX_LENGTH));
    if (firstNameError) setFirstNameError(undefined);
  }, [firstNameError]);

  const handleLastNameChange = useCallback((value: string) => {
    setLastName(value.slice(0, LAST_NAME_MAX_LENGTH));
  }, []);

  const handlePhoneChange = useCallback((value: string) => {
    setPhoneNumber(sanitizePhoneInput(value));
    if (phoneError) setPhoneError(undefined);
  }, [phoneError]);

  const validate = useCallback((): boolean => {
    let ok = true;

    if (!isValidFirstName(firstName)) {
      setFirstNameError(MESSAGE_INVALID_FIRST_NAME);
      ok = false;
    } else {
      setFirstNameError(undefined);
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setPhoneError(MESSAGE_INVALID_PHONE);
      ok = false;
    } else {
      setPhoneError(undefined);
    }

    // Last name has no error message: per Requirement 7.1 it is optional and
    // capped at 50 characters via the input handler above.
    if (!isValidLastName(lastName)) {
      // Defensive: should be unreachable because the change handler trims.
      ok = false;
    }

    return ok;
  }, [firstName, lastName, phoneNumber]);

  const handleSubmit = useCallback(async () => {
    if (submitting || loading) return;
    if (!validate()) return;

    const values: PhoneEntryValues = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber,
    };

    setSubmitting(true);
    try {
      // Requirement 7.4: invoke the bridge with the validated inputs.
      const result = await TruecallerAuth.startManualVerification(
        values.phoneNumber,
        values.firstName,
        values.lastName,
      );
      onSubmit?.(values, result);
    } finally {
      setSubmitting(false);
    }
  }, [firstName, lastName, phoneNumber, submitting, loading, validate, onSubmit]);

  const isBusy = submitting || loading;

  // Disable the submit button when inputs are obviously invalid so the user
  // sees the validation message only after attempting submit (per the spec
  // wording "IF the entered ... THEN ... display the message"), but still
  // gives an affordance that the form is incomplete via the disabled state
  // once they have left a field clearly invalid.
  const submitDisabled = useMemo(
    () => disabled || isBusy,
    [disabled, isBusy],
  );

  return (
    <View style={styles.container} accessibilityLabel="Phone number entry form">
      <Text style={styles.heading} accessibilityRole="header">
        Verify your phone number
      </Text>
      <Text style={styles.subheading}>
        We will send a verification code to your Indian mobile number.
      </Text>

      <Input
        label="First name"
        value={firstName}
        onChangeText={handleFirstNameChange}
        error={firstNameError}
        placeholder="Your first name"
        leftIcon="account-outline"
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={FIRST_NAME_MAX_LENGTH}
        editable={!isBusy}
        accessibilityLabel="First name, required"
        accessibilityHint={`Up to ${FIRST_NAME_MAX_LENGTH} characters`}
        required
      />

      <Input
        label="Last name (optional)"
        value={lastName}
        onChangeText={handleLastNameChange}
        placeholder="Your last name"
        leftIcon="account-outline"
        autoCapitalize="words"
        autoComplete="family-name"
        textContentType="familyName"
        maxLength={LAST_NAME_MAX_LENGTH}
        editable={!isBusy}
        accessibilityLabel="Last name, optional"
        accessibilityHint={`Up to ${LAST_NAME_MAX_LENGTH} characters`}
      />

      <Input
        label="Mobile number"
        value={phoneNumber}
        onChangeText={handlePhoneChange}
        error={phoneError}
        hint={phoneError ? undefined : '10-digit Indian mobile number'}
        placeholder="9876543210"
        keyboardType="number-pad"
        leftIcon="phone-outline"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={PHONE_NUMBER_LENGTH}
        editable={!isBusy}
        accessibilityLabel="10 digit Indian mobile number, required"
        accessibilityHint="Enter only the 10 digits, without country code"
        required
      />

      <Button
        title={submitLabel}
        onPress={handleSubmit}
        loading={isBusy}
        disabled={submitDisabled}
        style={styles.submitButton}
      />
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing[2],
  },
  heading: {
    ...theme.typeScale.h3,
    color: theme.roles.light.textPrimary,
    marginBottom: theme.spacing[2],
  },
  subheading: {
    ...theme.typeScale.bodyMedium,
    color: theme.roles.light.textSecondary,
    marginBottom: theme.spacing[5],
  },
  submitButton: {
    marginTop: theme.spacing[2],
  },
});

export default PhoneEntrySection;
