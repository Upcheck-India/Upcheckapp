import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsIn,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  ValidateIf,
  IsLatitude,
  IsLongitude,
  IsArray,
} from 'class-validator';

export class CreatePondDto {
  @IsUUID()
  farmId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4)
  namePrefix: string;

  @IsIn(['rectangular', 'circular', 'irregular', 'raceway'])
  geometryType: string;

  @IsIn(['earthen', 'lined', 'cage', 'biofloc_ras'])
  constructionType: string;

  // Conditional: required for rectangular and raceway
  @ValidateIf(
    (o) => o.geometryType === 'rectangular' || o.geometryType === 'raceway',
  )
  @IsNumber()
  @Min(1)
  @Max(500)
  lengthM?: number;

  @ValidateIf(
    (o) => o.geometryType === 'rectangular' || o.geometryType === 'raceway',
  )
  @IsNumber()
  @Min(1)
  @Max(500)
  widthM?: number;

  // Conditional: required for circular
  @ValidateIf((o) => o.geometryType === 'circular')
  @IsNumber()
  @Min(1)
  @Max(400)
  diameterM?: number;

  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  depthM: number;

  // Total installed aerator power (HP) — feeds the Aeration & Power optimizer.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  installedAeratorHp?: number;

  // Number of aerator units installed in the pond.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  aeratorCount?: number;

  // Optional: for raceway ponds
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  channelCount?: number;

  // Optional: manual override area (e.g. from survey)
  @IsOptional()
  @IsNumber()
  @Min(1)
  overrideAreaM2?: number;

  // Optional: display alias
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  // Optional: GPS coordinates
  @IsOptional()
  @IsLatitude()
  gpsLat?: number;

  @IsOptional()
  @IsLongitude()
  gpsLng?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  batchCount?: number;

  @IsOptional()
  @IsArray()
  boundary?: { latitude: number; longitude: number }[];
}
