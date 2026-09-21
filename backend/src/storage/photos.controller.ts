import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { PhotosService, type BackupScope, type FreeUpKind } from './photos.service';

export class FreeUpDto {
  @IsIn(['old', 'crop', 'pond'])
  kind: FreeUpKind;

  /** The cycle or pond; unused for 'old' (photos older than 12 months). */
  @ValidateIf((o) => o.kind !== 'old')
  @IsUUID()
  id?: string;
}

export class RemovePhotoDto {
  @IsString()
  @MaxLength(200)
  path: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/;
const isUuid = (v?: string): v is string => !!v && UUID_RE.test(v);

/**
 * F2: Settings → Photos & storage. Everything here is scoped to the caller's
 * own pool (the farms they own, their avatar and reports) inside the SQL, so
 * no route needs a farm capability — except the picker's quota read, which
 * reveals a pond owner's counts and therefore needs READ on the pond.
 */
@Controller('photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get('usage')
  usage(@CurrentUser() user) {
    return this.photos.usage(user.id);
  }

  @Get('quota/pond/:pondId')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Pond', 'pondId', 'farm.userId', 'READ')
  quota(@Param('pondId', ParseUUIDPipe) pondId: string) {
    return this.photos.quotaForPond(pondId);
  }

  /** `?pondId=` for a pond, or `?farmId=` for a farm's farm-level photos. */
  @Get('items')
  list(
    @CurrentUser() user,
    @Query('pondId') pondId?: string,
    @Query('farmId') farmId?: string,
  ) {
    const id = pondId ?? farmId;
    if (!id || !UUID_RE.test(id)) throw new BadRequestException('pondId or farmId required');
    return this.photos.list(user.id, pondId ? { pondId } : { farmId });
  }

  /**
   * F4: signed URLs + photos.csv metadata for one backup batch —
   * `?recordId=`, `?pondId=&month=YYYY-MM`, or `?cropId=`. READ on the pond
   * is checked in the service; money photos need VIEW_FINANCIALS.
   */
  @Get('backup')
  backup(
    @CurrentUser() user,
    @Query('recordId') recordId?: string,
    @Query('pondId') pondId?: string,
    @Query('month') month?: string,
    @Query('cropId') cropId?: string,
  ) {
    let scope: BackupScope;
    if (isUuid(recordId)) scope = { recordId };
    else if (isUuid(cropId)) scope = { cropId };
    else if (isUuid(pondId) && month) scope = { pondId, month };
    else throw new BadRequestException('recordId, cropId, or pondId + month required');
    return this.photos.backup(user.id, scope);
  }

  /** F4: the caller's cycles that have photos ("Back up my photos"). */
  @Get('backup/cycles')
  backupCycles(@CurrentUser() user) {
    return this.photos.backupCycles(user.id);
  }

  /** F3 / F4 / F7.8: what the viewer needs per photo — `?paths=a,b`, up to 20. */
  @Get('info')
  info(@CurrentUser() user, @Query('paths') paths?: string) {
    const list = (paths ?? '').split(',').filter((p) => PATH_RE.test(p)).slice(0, 20);
    return this.photos.info(user.id, list);
  }

  /** F3: oldest full-size photo + the next batch that shrinks (stamps the notice clock). */
  @Get('retention')
  retention(@CurrentUser() user) {
    return this.photos.retention(user.id);
  }

  @Get('free-up')
  freeUpOptions(@CurrentUser() user) {
    return this.photos.freeUpOptions(user.id);
  }

  @Post('free-up')
  freeUp(@CurrentUser() user, @Body() dto: FreeUpDto) {
    return this.photos.freeUp(user.id, dto.kind, dto.id);
  }

  @Delete('item')
  remove(@CurrentUser() user, @Body() dto: RemovePhotoDto) {
    return this.photos.removeOne(user.id, dto.path);
  }
}
