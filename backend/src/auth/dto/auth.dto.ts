import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    Matches,
    IsOptional,
    IsNotEmpty,
} from 'class-validator';

export class RegisterDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty()
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(50, { message: 'Password must not exceed 50 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    @IsNotEmpty()
    password: string;

    @IsString()
    @MinLength(2, { message: 'Name must be at least 2 characters long' })
    @MaxLength(100)
    @IsNotEmpty()
    name: string;
}

export class LoginDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}

export class ForgotPasswordDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty()
    email: string;
}

export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty()
    token: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(50)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    @IsNotEmpty()
    newPassword: string;
}

export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(50)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    @IsNotEmpty()
    newPassword: string;
}

export class UpdateProfileDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    profilePicture?: string;
}

export class GoogleAuthDto {
    @IsString()
    @IsNotEmpty()
    idToken: string;
}

export class RefreshTokenDto {
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class VerifyEmailDto {
    @IsString()
    @IsNotEmpty()
    token: string;
}

export class ResendVerificationDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty()
    email: string;
}
