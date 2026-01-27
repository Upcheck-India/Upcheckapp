import { IsString, IsOptional, IsNumber, IsDateString, IsUUID } from 'class-validator';

export class CreatePondDto {
    @IsUUID()
    farmId: string;

    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    pondCode?: string;

    @IsNumber()
    @IsOptional()
    areaM2?: number;

    @IsNumber()
    @IsOptional()
    depthM?: number;

    @IsString()
    @IsOptional()
    speciesType?: string;

    @IsDateString()
    @IsOptional()
    stockingDate?: string;

    @IsString()
    @IsOptional()
    status?: string;
}
