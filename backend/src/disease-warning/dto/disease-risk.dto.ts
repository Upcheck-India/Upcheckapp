import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import type { DiseaseIndicators } from '../disease-warning.service';

/** Validated body for `POST /disease-risk/compute` (S4). Unknown keys are stripped. */
export class DiseaseIndicatorsDto implements DiseaseIndicators {
  @IsOptional() @IsBoolean() tempDrop3in48h?: boolean;
  @IsOptional() @IsBoolean() doBelow4?: boolean;
  @IsOptional() @IsBoolean() seasonWinter?: boolean;
  @IsOptional() @IsBoolean() regionalWssv?: boolean;
  @IsOptional() @IsBoolean() redBody?: boolean;
  @IsOptional() @IsBoolean() entryRisk?: boolean;
  @IsOptional() @IsBoolean() docBelow35?: boolean;
  @IsOptional() @IsBoolean() yellowVibrioUp?: boolean;
  @IsOptional() @IsBoolean() emptyGut?: boolean;
  @IsOptional() @IsBoolean() paleHp?: boolean;
  @IsOptional() @IsBoolean() sizeCvUp?: boolean;
  @IsOptional() @IsBoolean() adgBelowExpected?: boolean;
  @IsOptional() @IsBoolean() whiteFecesTray?: boolean;
  @IsOptional() @IsBoolean() regionWfd?: boolean;
  @IsOptional() @IsBoolean() vibrioUp?: boolean;
  @IsOptional() @IsBoolean() ehpRiskUp?: boolean;
  @IsOptional() @IsBoolean() luminousVibrioUp?: boolean;
  @IsOptional() @IsBoolean() nightGlow?: boolean;
  @IsOptional() @IsBoolean() chronicDailyMortality?: boolean;
  @IsOptional() @IsBoolean() multiStress?: boolean;
  @IsOptional() @IsBoolean() looseShellObs?: boolean;
  @IsOptional() @IsBoolean() mineralDeficit?: boolean;
  @IsOptional() @IsBoolean() hpStress?: boolean;
}

/** Validated body for `POST /disease-risk` (S4). */
export class DiseaseRiskSnapshotDto {
  @IsUUID()
  pondId: string;

  /** Must be the pond's active crop — checked in the service. */
  @IsOptional()
  @IsUUID()
  cropId?: string;

  @IsDateString()
  date: string;

  @ValidateNested()
  @Type(() => DiseaseIndicatorsDto)
  indicators: DiseaseIndicatorsDto;
}
