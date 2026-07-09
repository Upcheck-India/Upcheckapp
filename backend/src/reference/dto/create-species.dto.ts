import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateSpeciesDto {
  @IsString()
  scientificName: string;

  @IsString()
  @IsOptional()
  commonName?: string;

  @IsNumber()
  @IsOptional()
  optimalPhMin?: number;

  @IsNumber()
  @IsOptional()
  optimalPhMax?: number;

  @IsNumber()
  @IsOptional()
  optimalSalinityMin?: number;

  @IsNumber()
  @IsOptional()
  optimalSalinityMax?: number;

  @IsNumber()
  @IsOptional()
  optimalTempMin?: number;

  @IsNumber()
  @IsOptional()
  optimalTempMax?: number;
}
