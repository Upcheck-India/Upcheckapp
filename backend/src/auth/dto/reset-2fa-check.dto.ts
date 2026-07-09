import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body for POST /auth/supabase/reset-2fa-check (AUTH-2).
 *
 * After a password reset the client holds a live Supabase *recovery* session
 * (access + refresh token) it obtained directly from the deep-link fragment.
 * It hands both tokens here so the server can resolve the user, decide whether
 * a TOTP challenge is required, and — if so — stash the session under a 2FA
 * temp token instead of letting the recovery session enter the app unchecked.
 */
export class Reset2faCheckDto {
    @IsString()
    @IsNotEmpty()
    accessToken: string;

    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}
