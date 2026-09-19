import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { MoltService } from './molt.service';

export class MoltActionDto {
  /** Client-minted id (saveRecord); declared so whitelist does not strip it. */
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}-(new|full)$/)
  windowKey: string;

  @IsString()
  @MaxLength(40)
  actionKey: string;

  @IsBoolean()
  done: boolean;
}

/**
 * Molt windows + per-pond molt checklist. Route guard AND service-level
 * `assertCanAccessPond` (which also applies pond scoping) — same capability.
 */
@Controller('molt')
export class MoltController {
  constructor(private readonly service: MoltService) {}

  /** Upcoming molt windows (current first), IST dates. */
  @Get('windows')
  windows(@Query('count') count?: string) {
    const n = Math.min(12, Math.max(1, Number(count) || 3));
    return this.service.windows(n);
  }

  /** Every readable active pond with checklist progress. */
  @Get('ponds')
  ponds(@CurrentUser() user) {
    return this.service.forUser(user.id);
  }

  @Get('ponds/:pondId')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Pond', 'pondId', 'farm.userId', 'READ')
  pond(@Param('pondId', ParseUUIDPipe) pondId: string, @CurrentUser() user) {
    return this.service.forPond(pondId, user.id);
  }

  @Post('ponds/:pondId/actions')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Pond', 'pondId', 'farm.userId', 'WRITE_OPERATIONAL')
  setAction(
    @Param('pondId', ParseUUIDPipe) pondId: string,
    @Body() body: MoltActionDto,
    @CurrentUser() user,
  ) {
    return this.service.setAction(pondId, user.id, body);
  }
}
