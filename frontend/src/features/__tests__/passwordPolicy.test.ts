import { passwordPolicyError, isPasswordValid } from '../passwordPolicy';

// Parity with the backend SignupDto regex:
// /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/ + min length 8
describe('passwordPolicy (PWDVAL-1 client/server parity)', () => {
    it('accepts a password the server accepts, including # as a special char', () => {
        expect(isPasswordValid('MyPass#123')).toBe(true); // regressed before: # was outside old set
        expect(isPasswordValid('Str0ng!Pass')).toBe(true);
    });

    it('rejects the classic too-weak field password', () => {
        // "ramukumar123" — no upper, no special → the old client passed it, server rejected.
        expect(passwordPolicyError('ramukumar123')?.key).toBe('auth.passwordRuleUpper');
    });

    it('flags each missing rule in order', () => {
        expect(passwordPolicyError('short1A!')).toBeNull();            // exactly 8, all rules
        expect(passwordPolicyError('abc')?.key).toBe('auth.passwordRuleLength');
        expect(passwordPolicyError('ALLUPPER1!')?.key).toBe('auth.passwordRuleLower');
        expect(passwordPolicyError('alllower1!')?.key).toBe('auth.passwordRuleUpper');
        expect(passwordPolicyError('NoDigits!!')?.key).toBe('auth.passwordRuleDigit');
        expect(passwordPolicyError('NoSpecial1')?.key).toBe('auth.passwordRuleSpecial');
    });
});

// PWDVAL-1 cross-boundary parity check. The two implementations are written
// independently (frontend: discrete per-rule regex tests; backend
// `SignupDto`: one combined lookahead regex — see
// backend/src/auth/dto/signup.dto.ts) and each side's own test only checks
// its own logic against its own examples. Neither previously proved the two
// actually agree on the same input. This block runs the SAME fixture set
// through the client policy AND a byte-for-byte copy of the backend regex,
// so a future edit to either side that silently diverges gets caught here —
// keep BACKEND_PASSWORD_REGEX identical to the one in signup.dto.ts.
const BACKEND_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
const backendAccepts = (pw: string) => pw.length >= 8 && BACKEND_PASSWORD_REGEX.test(pw);

describe('passwordPolicy vs backend SignupDto regex — cross-boundary parity (PWDVAL-1)', () => {
    const fixtures: Array<[label: string, pw: string]> = [
        ['plain valid', 'MyPass#123'],
        ['exactly 8 chars, all rules met', 'short1A!'],
        ['7 chars — one under the minimum', 'Sh0rt1!'],
        ['no special character', 'NoSpecial1'],
        ['no digit', 'NoDigits!!'],
        ['no uppercase', 'alllower1!'],
        ['no lowercase', 'ALLUPPER1!'],
        ['hyphen as the special char', 'My-Pass1'],
        ['underscore + period as specials', 'My_Pass1.'],
        ['space as the special char', 'My Pass1'],
        ['emoji as the special char (multi-byte)', 'MyPass1😀'],
        ['accented letter counts as special, not a letter class', 'MyPass1é'],
        ['very long password, all rules met', `Aa1!${'x'.repeat(200)}`],
        ['only symbols — missing letters and digit', '!!!!!!!!'],
        ['leading/trailing whitespace, otherwise valid', ' MyPass1! '],
    ];

    it.each(fixtures)('agrees with the backend regex: %s (%s)', (_label, pw) => {
        expect(isPasswordValid(pw)).toBe(backendAccepts(pw));
    });
});
