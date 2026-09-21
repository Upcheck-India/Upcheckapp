// C5.5: any app on the device can fire upcheckapp://reset-password#…, so only a
// recovery token for this project that has not expired may become a session.
import { parseRecoveryLink } from '../recoveryLink';

const PROJECT = 'https://proj.supabase.co';
const NOW = 1_800_000_000_000;

const b64url = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (payload: object) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.sig`;

const link = (access: string, type = 'recovery') =>
    `upcheckapp://reset-password#access_token=${access}&expires_in=3600&refresh_token=rt123&token_type=bearer&type=${type}`;

const good = jwt({ iss: `${PROJECT}/auth/v1`, exp: NOW / 1000 + 3600, sub: 'u1' });

it('accepts a live recovery token from this project', () => {
    expect(parseRecoveryLink(link(good), PROJECT, NOW)).toEqual({ access_token: good, refresh_token: 'rt123' });
});

it('tolerates a trailing slash on the configured project url', () => {
    expect(parseRecoveryLink(link(good), `${PROJECT}/`, NOW)).not.toBeNull();
});

it.each([
    ['wrong issuer', link(jwt({ iss: 'https://evil.supabase.co/auth/v1', exp: NOW / 1000 + 3600 }))],
    ['issuer missing', link(jwt({ exp: NOW / 1000 + 3600 }))],
    ['wrong type', link(good, 'magiclink')],
    ['type missing', `upcheckapp://reset-password#access_token=${good}&refresh_token=rt123`],
    ['expired', link(jwt({ iss: `${PROJECT}/auth/v1`, exp: NOW / 1000 - 1 }))],
    ['no exp', link(jwt({ iss: `${PROJECT}/auth/v1` }))],
    ['garbage token', link('not-a-jwt')],
    ['undecodable payload', link('a.%%%.c')],
    ['no refresh token', `upcheckapp://reset-password#access_token=${good}&type=recovery`],
    ['no fragment', 'upcheckapp://reset-password'],
])('rejects %s', (_label, url) => {
    expect(parseRecoveryLink(url, PROJECT, NOW)).toBeNull();
});

it('rejects everything when the project url is not configured', () => {
    expect(parseRecoveryLink(link(good), undefined, NOW)).toBeNull();
});
