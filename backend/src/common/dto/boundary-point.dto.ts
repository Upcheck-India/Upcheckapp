import { IsLatitude, IsLongitude } from 'class-validator';

/** A single GPS vertex of a farm/pond boundary polygon. */
export class BoundaryPointDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}
