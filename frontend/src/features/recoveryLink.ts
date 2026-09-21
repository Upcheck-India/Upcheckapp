/**
 * C5.5 — validate a password-recovery deep link before it becomes a session.
 *
 * `upcheckapp://reset-password#access_token=…&refresh_token=…&type=recovery`
 * can be fired at the app by ANY other app on the device. Handing those tokens
 * to `supabase.auth.setSession` unchecked let a caller put the app into a
 * session of its choosing — and for an expired access token supabase-js does
 * not even verify it, it spends the supplied refresh token instead.
 *
 * So a link is only accepted when:
 *   - the fragment says `type=recovery`,
 *   - the access token's `iss` is THIS project's auth server
 *     (`<supabaseUrl>/auth/v1`),
 *   - the access token has not expired.
 * Anything else returns null and the caller ignores the link.
 *
 * This is a gate, not the proof: the signature is checked server-side by
 * `setSession` (GET /user) for the unexpired token we let through. PKCE /
 * token_hash would be stronger but needs the email template and the server's
 * `resetPasswordForEmail` call changed, which is out of scope here.
 */
export interface RecoveryTokens {
    access_token: string;
    refresh_token: string;
}

const fragmentParam = (fragment: string, key: string): string | null => {
    const m = fragment.match(new RegExp(`(?:^|&)${key}=([^&]+)`));
    if (!m) return null;
    try {
        return decodeURIComponent(m[1]);
    } catch {
        return null;
    }
};

const jwtPayload = (token: string): { iss?: unknown; exp?: unknown } | null => {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
        const payload = JSON.parse(json);
        return payload && typeof payload === 'object' ? payload : null;
    } catch {
        return null;
    }
};

export function parseRecoveryLink(
    url: string | null,
    supabaseUrl: string | undefined,
    nowMs: number = Date.now(),
): RecoveryTokens | null {
    if (!url || !supabaseUrl) return null;
    const fragment = url.split('#')[1] ?? '';
    if (fragmentParam(fragment, 'type') !== 'recovery') return null;

    const access_token = fragmentParam(fragment, 'access_token');
    const refresh_token = fragmentParam(fragment, 'refresh_token');
    if (!access_token || !refresh_token) return null;

    const payload = jwtPayload(access_token);
    if (!payload) return null;
    const expectedIss = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
    if (payload.iss !== expectedIss) return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) return null;

    return { access_token, refresh_token };
}
