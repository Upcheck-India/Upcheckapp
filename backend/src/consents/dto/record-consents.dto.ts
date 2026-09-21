import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import {
  CONSENT_KINDS,
  CONSENT_SOURCES,
  type ConsentKind,
  type ConsentSource,
} from '../consent-kinds';

export class ConsentRowDto {
  /** Client-minted: a replay of the same row inserts nothing. */
  @IsUUID()
  id: string;

  @IsIn([...CONSENT_KINDS])
  kind: ConsentKind;

  @IsBoolean()
  granted: boolean;

  @IsString()
  @Length(1, 32)
  docVersion: string;

  @IsString()
  @Length(2, 16)
  locale: string;

  @IsIn([...CONSENT_SOURCES])
  source: ConsentSource;
}

export class RecordConsentsDto {
  /** The offline queue stamps a batch id; declared so whitelist keeps it. */
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ConsentRowDto)
  consents: ConsentRowDto[];
}
