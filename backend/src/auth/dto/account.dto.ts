import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from './signup.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const lowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const ACCOUNT_CODE_PURPOSES = ['set_password', 'change_email'] as const;
export type AccountCodePurpose = (typeof ACCOUNT_CODE_PURPOSES)[number];

/** PATCH /profiles/me */
export class UpdateMyProfileDto {
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  fullName: string;
}

/** POST /auth/supabase/account/email-code */
export class AccountEmailCodeDto {
  @IsIn(ACCOUNT_CODE_PURPOSES)
  purpose: AccountCodePurpose;

  @ValidateIf((o) => o.purpose === 'change_email')
  @Transform(lowerTrim)
  @IsEmail()
  newEmail?: string;
}

class CodeDto {
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code: string;
}

/** POST /auth/supabase/account/set-password */
export class SetPasswordDto extends CodeDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  newPassword: string;
}

/** POST /auth/supabase/account/change-email */
export class ChangeEmailDto extends CodeDto {
  @Transform(lowerTrim)
  @IsEmail()
  newEmail: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;
}

/** POST /auth/supabase/account/link-google */
export class LinkGoogleDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
