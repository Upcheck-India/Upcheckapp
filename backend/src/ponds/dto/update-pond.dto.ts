import { IsString, IsOptional, IsNumber, IsLatitude, IsLongitude, IsEnum, MaxLength, IsArray, IsUUID } from 'class-validator';

export class UpdatePondDto {
    @IsOptional()
    @IsNumber()
    lengthM?: number;

    @IsOptional()
    @IsNumber()
    widthM?: number;

    @IsOptional()
    @IsNumber()
    diameterM?: number;

    @IsOptional()
    @IsNumber()
    depthM?: number;

    @IsOptional()
    @IsNumber()
    channelCount?: number;

    @IsOptional()
    @IsNumber()
    overrideAreaM2?: number;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    displayName?: string;

    @IsOptional()
    @IsLatitude()
    gpsLat?: number;

    @IsOptional()
    @IsLongitude()
    gpsLng?: number;

    @IsOptional()
    @IsEnum(['earthen', 'lined', 'cage', 'biofloc_ras'])
    constructionType?: string;

    // Reason for dimension change (logged in history)
    @IsOptional()
    @IsString()
    @MaxLength(255)
    changeReason?: string;

    @IsOptional()
    @IsArray()
    boundary?: { latitude: number, longitude: number }[];

    @IsOptional()
    @IsUUID()
    activeCycleId?: string | null;
}
