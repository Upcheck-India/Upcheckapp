import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateFeedProductDto {
  @IsString()
  brand: string;

  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string; // pellet, powder, etc.

  @IsString()
  @IsOptional()
  sizeRangeMm?: string;

  @IsNumber()
  @IsOptional()
  proteinPercent?: number;
}
