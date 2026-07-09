import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateNewsArticleDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsDateString()
  @IsOptional()
  publishedAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
