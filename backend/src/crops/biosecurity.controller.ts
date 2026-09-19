import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { BIOSECURITY_KEYS, BiosecurityService, PcrResults } from './biosecurity.service';

/** `null` clears a field, so each is validated only when not null. */
export class SeedHealthDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsBoolean()
  plSpf?: boolean | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  plPcrDate?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(120)
  plPcrLab?: string | null;

  /** Keys/values checked by `parsePcrResults`. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  plPcrResults?: PcrResults | null;
}

export class BiosecurityCheckDto {
  /** Client-minted id (saveRecord); declared so whitelist does not strip it. */
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsIn(BIOSECURITY_KEYS)
  itemKey: string;

  @IsBoolean()
  done: boolean;

  @IsOptional()
  @IsDateString()
  doneOn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/**
 * Seed PCR + biosecurity checklist per cycle (D5). Route guard AND the
 * service's `findOneAccessible` (pond scoping) — same capability.
 */
@Controller('crops')
export class BiosecurityController {
  constructor(private readonly service: BiosecurityService) {}

  @Get(':id/biosecurity')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Crop', 'id', 'pond.farm.userId', 'READ')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user) {
    return this.service.forCrop(id, user.id);
  }

  @Patch(':id/seed')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Crop', 'id', 'pond.farm.userId', 'WRITE_MANAGEMENT')
  setSeed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SeedHealthDto,
    @CurrentUser() user,
  ) {
    return this.service.setSeed(id, user.id, body);
  }

  @Post(':id/biosecurity')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Crop', 'id', 'pond.farm.userId', 'WRITE_OPERATIONAL')
  setCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: BiosecurityCheckDto,
    @CurrentUser() user,
  ) {
    return this.service.setCheck(id, user.id, body);
  }
}
