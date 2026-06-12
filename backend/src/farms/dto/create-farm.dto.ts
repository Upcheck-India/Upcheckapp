import { IsString, IsOptional, IsNumber, IsLatitude, IsLongitude, IsIn, IsArray } from 'class-validator';

export class CreateFarmDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    farmCode?: string;

    @IsOptional()
    @IsNumber()
    areaHectares?: number;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsLongitude()
    longitude?: number;

    @IsOptional()
    @IsLatitude()
    latitude?: number;

    @IsOptional()
    @IsIn(['tidal', 'river', 'borehole', 'reservoir', 'recycled'])
    waterSourceType?: string;

    @IsOptional()
    @IsString()
    privacySetting?: string;

    @IsOptional()
    @IsArray()
    boundary?: { latitude: number, longitude: number }[];

    @IsString()
    @IsOptional()
    qrCodeUrl?: string;

}
