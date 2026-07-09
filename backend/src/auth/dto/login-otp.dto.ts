import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginOtpRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class LoginOtpVerifyDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
