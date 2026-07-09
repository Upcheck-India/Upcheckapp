import {
  IsNotEmpty,
  IsString,
  IsPhoneNumber,
  Length,
  IsOptional,
} from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;

  @IsOptional()
  @IsString()
  hash?: string; // For auto-verification if needed (SMS retriever API)
}
