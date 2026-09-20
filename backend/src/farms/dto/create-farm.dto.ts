import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
  IsIn,
  IsArray,
  IsNotEmpty,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
// IsOptional() already treats null the same as undefined — it skips every
// other decorator on the property, so `null` (the "clear this field" signal
// UpdateFarmDto relies on) is never run through IsLatitude/IsLongitude/etc.
import { Type } from 'class-transformer';
import { BoundaryPointDto } from '../../common/dto/boundary-point.dto';

export class CreateFarmDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  // NOTE: no `farmCode` here on purpose. It used to be an optional
  // client-supplied 50-char string that `farms.service.create()` preferred over
  // `generateFarmCode()`, which defeated the generator's entropy entirely — and
  // while the farm code doubles as the join credential, that let an owner pick
  // a trivially guessable one. The code is always generated server-side now.

  @IsOptional()
  @IsNumber()
  areaHectares?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  // Coordinates are optional and, if captured at all, rounded to ~1km on the
  // device before they ever reach here (farm-location-strategy.md Option B).
  // `null` is a deliberate "clear the location" signal — see UpdateFarmDto,
  // which is where clearing actually happens; CreateFarmDto only needs to not
  // reject it if a caller sends null on create too.
  @IsOptional()
  @IsLongitude()
  longitude?: number | null;

  @IsOptional()
  @IsLatitude()
  latitude?: number | null;

  // LGD-style codes (docs/strategy/farm-location-strategy.md Option B). Not
  // validated against the committed list here — an unrecognised code just
  // means a district feature (weather/price/disease) has nothing to key off,
  // not a broken farm record.
  @IsOptional()
  @IsString()
  @MaxLength(8)
  stateCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  districtCode?: string | null;

  @IsOptional()
  @IsIn(['tidal', 'river', 'borehole', 'reservoir', 'recycled'])
  waterSourceType?: string;

  // Number of ponds the owner declares at first-run setup (planning target).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  plannedPondCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  privacySetting?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => BoundaryPointDto)
  boundary?: BoundaryPointDto[];

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  qrCodeUrl?: string;
}
