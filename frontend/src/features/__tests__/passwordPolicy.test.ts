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
