import { IsString, IsOptional, IsNumber, IsUrl, IsEnum, IsLatitude, IsLongitude } from 'class-validator';

export class CreateFarmDto {
    @IsString()
    userId: string; // Ideally this should be removed from DTO and taken from JWT, but we'll validate it for now

    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    farmCode?: string;

    @IsNumber()
    @IsOptional()
    areaHectares?: number;

    @IsString()
    @IsOptional()
    address?: string;

    @IsLongitude()
    @IsOptional()
    longitude?: number;

    @IsLatitude()
    @IsOptional()
    latitude?: number;

    @IsUrl()
    @IsOptional()
    qrCodeUrl?: string;

    @IsString()
    @IsOptional()
    privacySetting?: string;
}
