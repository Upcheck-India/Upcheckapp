import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SimulationScenarioType {
  FeedChange = 'feed_change',
  PriceChange = 'price_change',
  StockingDensity = 'stocking_density',
}

export class SimulationVariablesDto {
  @IsNumber()
  @IsOptional()
  feedPrice?: number;

  @IsNumber()
  @IsOptional()
  growthImprovement?: number;

  @IsNumber()
  @IsOptional()
  sellingPrice?: number;

  @IsNumber()
  @IsOptional()
  stockingDensity?: number;
}

export class RunSimulationDto {
  @IsUUID()
  pondId: string;

  @IsEnum(SimulationScenarioType)
  scenarioType: SimulationScenarioType;

  @ValidateNested()
  @Type(() => SimulationVariablesDto)
  variables: SimulationVariablesDto;
}
