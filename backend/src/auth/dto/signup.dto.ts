import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

/**
 * Server-side validation for POST /auth/supabase/signup.
 *
 * Enforces email format and password strength at the trust boundary — the
 * signup handler previously took an untyped inline body, so the global
 * ValidationPipe validated nothing and weak passwords / malformed emails
 * reached Supabase unchecked. Name/username/accountType stay lenient to match
 * what the app sends (whitelist:true strips anything extra).
 */
export class SignupDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    password: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsIn(['owner', 'worker'])
    accountType?: 'owner' | 'worker';
}
