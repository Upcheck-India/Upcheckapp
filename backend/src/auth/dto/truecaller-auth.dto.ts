import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsIn,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Class-level invariant for {@link TruecallerAuthDto}: exactly one of
 * `accessToken` (OTP / Flow B) or `payload` (One-Tap / Flow A and
 * PROFILE_VERIFIED_BEFORE) must be present on the request.
 *
 * Validates Requirements 6.2, 8.5, 8.6, 13.4: the controller dispatches on
 * body shape, so the DTO must reject ambiguous requests that supply both
 * an access token and a signed payload, as well as requests that supply
 * neither.
 */
@ValidatorConstraint({ name: 'truecallerExactlyOneCredential', async: false })
export class TruecallerExactlyOneCredentialConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as TruecallerAuthDto;
    const hasAccessToken =
      typeof dto.accessToken === 'string' && dto.accessToken.length > 0;
    const hasPayload =
      typeof dto.payload === 'string' && dto.payload.length > 0;
    // Exactly one of the two credential channels must be present (XOR).
    return hasAccessToken !== hasPayload;
  }

  defaultMessage(): string {
    return 'Exactly one of accessToken or payload must be provided';
  }
}

export class TruecallerAuthDto {
  // ──────────────────────────────────────────────────────────────────
  // Credential channels — exactly one must be present.
  //
  // Implementation note: `class-validator`'s `@Validate(constraint)` is a
  // *property*-level decorator (the implementation calls
  // `registerDecorator({ propertyName, ... })`). When attached to a
  // class declaration the registration is a silent no-op, so we hang the
  // XOR invariant off `phoneNumber` instead — that field is always
  // present (`@IsNotEmpty()` below) and the constraint receives the
  // whole DTO via `args.object`, which is all the validator needs.
  // ──────────────────────────────────────────────────────────────────

  /** OTP / missed-call flow (Flow B) — opaque token exchanged server-to-server. */
  @IsString()
  @IsOptional()
  accessToken?: string;

  /** One-Tap flow (Flow A) and PROFILE_VERIFIED_BEFORE — base64 JSON. */
  @IsString()
  @IsOptional()
  payload?: string;

  /** Base64 RSA signature over `payload`. Required when `payload` is present. */
  @IsString()
  @IsOptional()
  signature?: string;

  /** RSA signature algorithm declared by the SDK. */
  @IsString()
  @IsOptional()
  @IsIn(['SHA512withRSA', 'SHA256withRSA'])
  signatureAlgorithm?: string;

  /** Per-request nonce; cross-checked against the value embedded in `payload`. */
  @IsString()
  @IsOptional()
  requestNonce?: string;

  // ──────────────────────────────────────────────────────────────────
  // Common profile fields
  // ──────────────────────────────────────────────────────────────────

  @IsString()
  @IsNotEmpty()
  @Validate(TruecallerExactlyOneCredentialConstraint)
  phoneNumber: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}
