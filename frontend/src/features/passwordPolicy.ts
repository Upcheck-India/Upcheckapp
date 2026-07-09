/**
 * Client-side password policy — MUST stay in lockstep with the backend
 * `SignupDto` rule (PWDVAL-1/PWDVAL-2):
 *   backend regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/ + min length 8
 * i.e. ≥8 chars, ≥1 lowercase, ≥1 uppercase, ≥1 digit, and ≥1 special character
 * (any non-alphanumeric — `#`, `-`, `_`, `.`, `@`, `!`, … all count).
 *
 * Validating here (with translated field errors) means every password the form
 * accepts is accepted by the server, so farmers never hit a raw, untranslated
 * English class-validator rejection after submit.
 *
 * Returns the first failing rule as an i18n { key, fallback }, or null if valid.
 */
export interface PasswordRuleError {
    key: string;
    fallback: string;
}

export function passwordPolicyError(pw: string): PasswordRuleError | null {
    if (pw.length < 8) return { key: 'auth.passwordRuleLength', fallback: 'Use at least 8 characters' };
    if (!/[a-z]/.test(pw)) return { key: 'auth.passwordRuleLower', fallback: 'Add a lowercase letter' };
    if (!/[A-Z]/.test(pw)) return { key: 'auth.passwordRuleUpper', fallback: 'Add an uppercase letter' };
    if (!/\d/.test(pw)) return { key: 'auth.passwordRuleDigit', fallback: 'Add a number' };
    if (!/[^A-Za-z0-9]/.test(pw)) return { key: 'auth.passwordRuleSpecial', fallback: 'Add a special character (e.g. # @ ! -)' };
    return null;
}

/** True when the password satisfies every rule (parity with the server). */
export function isPasswordValid(pw: string): boolean {
    return passwordPolicyError(pw) === null;
}
