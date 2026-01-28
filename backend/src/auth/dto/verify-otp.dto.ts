import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyOtpDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsNotEmpty()
    token: string;
}
