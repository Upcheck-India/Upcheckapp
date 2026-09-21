import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

// A valid Expo push token, and nothing else. This endpoint used to accept
// any non-empty string, which let a stringified JS error (from a failed
// getExpoPushTokenAsync() on the client) get persisted as `users.push_token`.
export const EXPO_PUSH_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  @Matches(EXPO_PUSH_TOKEN_RE, { message: 'token must be a valid Expo push token' })
  token: string;
}
