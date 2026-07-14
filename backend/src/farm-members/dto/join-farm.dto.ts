import { IsString, Matches } from 'class-validator';

export class JoinFarmDto {
  // Farm codes are 8 chars from the charset in farms.service.ts's
  // generateFarmCode() (A-Z minus I/O, 2-9 minus 0/1). Normalize case
  // client-side; validate shape here rather than trusting free text.
  @IsString()
  @Matches(/^[A-Z0-9]{8}$/, {
    message: 'code must be an 8-character farm code',
  })
  code: string;
}
