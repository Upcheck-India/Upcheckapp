import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

/**
 * Exactly one of email / phone / id — a staffer looking a farmer up already
 * knows which one they have. `phone` is matched against the SAME canonical
 * form the app stores (`canonicalPhone()` in supabase-auth.service.ts), not
 * whatever a staffer happens to paste.
 */
export class SearchUsersDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsUUID()
  @IsOptional()
  id?: string;
}

export class SearchFarmsDto {
  // Prefix search, min 3 chars — short enough to be a real filter, long
  // enough that a table scan isn't returning half the farms in the system.
  @IsString()
  @MinLength(3)
  name: string;
}
