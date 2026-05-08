import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateBroodstockDto {
    @IsString()
    supplier: string;

    @IsString()
    @IsOptional()
    lineCode?: string;

    @IsString()
    @IsOptional()
    origin?: string;

    @IsObject()
    @IsOptional()
    specifications?: object;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
