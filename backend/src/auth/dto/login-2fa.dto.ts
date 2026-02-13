import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class Login2faDto {
    @IsString()
    @IsNotEmpty()
    tempToken: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(9)
    token: string;
}
