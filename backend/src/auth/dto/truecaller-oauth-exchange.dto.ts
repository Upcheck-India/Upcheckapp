import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Request body for `POST /auth/supabase/oauth/truecaller/exchange`.
 *
 * The `@dhana-cs/react-native-truecaller` One-Tap flow returns a Truecaller
 * OAuth 2.0 authorization code together with the PKCE `codeVerifier` (and a
 * CSRF `state`). The backend completes the exchange server-to-server; the
 * client never sees the resulting access token or the verified profile until
 * a Supabase session is minted.
 *
 * Unlike the legacy {@link TruecallerAuthDto}, no identity fields are accepted
 * here — the phone/name come exclusively from Truecaller's userinfo response
 * (a client cannot forge them).
 */
export class TruecallerOAuthExchangeDto {
  /** OAuth 2.0 authorization code from `requestVerification()`. */
  @IsString()
  @IsNotEmpty()
  authorizationCode: string;

  /** PKCE code verifier paired with the challenge the SDK sent to Truecaller. */
  @IsString()
  @IsNotEmpty()
  codeVerifier: string;

  /** CSRF state echoed by the SDK; forwarded for optional cross-checking. */
  @IsString()
  @IsOptional()
  state?: string;
}
