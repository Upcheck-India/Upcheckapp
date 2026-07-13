// #31 — the password-reset email link opened Sign In instead of the
// reset-password screen. Root cause (confirmed by reading
// @react-navigation/native's extractPathFromURL): it splits the URL on `?`
// but never `#`, so Supabase's recovery link
// (upcheckapp://reset-password#access_token=...&type=recovery) produced the
// path "reset-password#access_token=..." — which can never match the
// configured 'reset-password' route. linking.getStateFromPath strips the
// fragment before matching; this locks in that fix.
import { linking } from '../linking';

describe('linking.getStateFromPath (#31)', () => {
    it('resolves the same navigation state with or without a Supabase recovery fragment', () => {
        const withFragment = linking.getStateFromPath(
            'reset-password#access_token=abc&refresh_token=def&type=recovery',
            linking.config as any,
        );
        const withoutFragment = linking.getStateFromPath('reset-password', linking.config as any);

        expect(withFragment).not.toBeUndefined();
        expect(withFragment).toEqual(withoutFragment);
    });

    it('still resolves otp-callback normally (no fragment involved)', () => {
        const state = linking.getStateFromPath('otp-callback', linking.config as any);
        expect(state).not.toBeUndefined();
    });

    it('returns undefined for a path that matches no configured screen', () => {
        const state = linking.getStateFromPath('totally-unknown-path', linking.config as any);
        expect(state).toBeUndefined();
    });
});
