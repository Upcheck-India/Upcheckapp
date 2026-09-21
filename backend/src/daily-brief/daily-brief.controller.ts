import { Controller, Get, Query } from '@nestjs/common';
import { CachedRead } from '../common/response-cache';
import { IsDateString, IsOptional, IsUUID, Matches } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DailyBriefService } from './daily-brief.service';

export class DailyBriefQueryDto {
  /** IST calendar day. ≤ today and ≥ 2020-01-01 are checked in the service (they depend on "now"). */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  @IsDateString({ strict: true })
  date: string;

  @IsOptional()
  @IsUUID()
  farmId?: string;
}

/**
 * `GET /daily-brief?date=YYYY-MM-DD&farmId=` — no route guard beyond the global
 * JwtAuthGuard: the service asserts READ on an explicit farmId (404/403) and
 * scopes every row through FarmAccessService, same as /activity.
 */
@Controller('daily-brief')
export class DailyBriefController {
  constructor(private readonly service: DailyBriefService) {}

  @Get()
  @CachedRead(60)
  get(@CurrentUser() user, @Query() q: DailyBriefQueryDto) {
    return this.service.get(user.id, q);
  }
}
