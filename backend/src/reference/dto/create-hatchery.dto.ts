import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateHatcheryDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsObject()
    @IsOptional()
    contactInfo?: object;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
