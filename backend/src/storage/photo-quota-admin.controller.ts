import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/auth.decorators';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { AdminSubject } from '../admin-access-log/admin-subject.decorator';
import { PhotosService } from './photos.service';
import { PhotoLedgerService } from './photo-ledger.service';
import { ResetQuotaOverrideDto, SetQuotaOverrideDto } from './dto/set-quota-override.dto';

/**
 * Admin photo-quota management (items 1 & 2 of the spec): staff-only
 * (AdminKeyGuard, see its docs) usage lookup and per-account limit override.
 * No photo viewing or deleting here — numbers only, matching the owner's
 * chosen scope.
 */
@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin')
export class PhotoQuotaAdminController {
  constructor(
    private readonly photos: PhotosService,
    private readonly ledger: PhotoLedgerService,
  ) {}

  /** Top N accounts by bytes used, for /storage on the dashboard. */
  @Get('storage/top')
  topUsers(@Query('limit') limit?: string) {
    const n = Math.min(Math.max(Number(limit) || 50, 1), 50);
    return this.photos.topUsers(n);
  }

  /** One account's usage (item 1) + its override, if any (item 2). */
  @Get('users/:id/storage')
  @AdminSubject('user')
  async getStorage(@Param('id', ParseUUIDPipe) id: string) {
    const [usage, override, history] = await Promise.all([
      this.photos.usage(id),
      this.ledger.getOverride(id),
      this.ledger.overrideHistory(id),
    ]);
    return { ...usage, override, history };
  }

  /**
   * Set an override. `req.adminStaff` (attached by AdminKeyGuard) is the
   * ONLY source of `set_by` — never a value from the request body, so a
   * staffer cannot attribute the change to someone else.
   */
  @Put('users/:id/storage/limit')
  @AdminSubject('user')
  async setLimit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetQuotaOverrideDto,
    @Req() req: Request,
  ) {
    const setBy = (req as any).adminStaff as string;
    return this.ledger.setOverride(id, { maxPhotos: dto.maxPhotos, maxBytes: dto.maxBytes }, dto.reason, setBy);
  }

  /** Back to the default quota — still requires a reason, still logged. */
  @Delete('users/:id/storage/limit')
  @AdminSubject('user')
  async resetLimit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetQuotaOverrideDto,
    @Req() req: Request,
  ) {
    const setBy = (req as any).adminStaff as string;
    await this.ledger.resetOverride(id, dto.reason, setBy);
    return { reset: true };
  }
}
