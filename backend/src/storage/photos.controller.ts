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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { PhotosService, type BackupScope, type FreeUpKind } from './photos.service';
import { PhotoTermsAckService } from './photo-terms-ack.service';
import { HealthPhotoStorageService, MAX_HEALTH_PHOTO_BYTES } from '../health-observations/health-photo-storage.service';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { UPLOAD_THROTTLE } from './r2-storage.service';
import { DailyUploadCapGuard } from './daily-upload-cap.guard';
import { PHOTO_SURFACES, type SurfaceKey } from './photo-surfaces';
import type { UploadedImage } from '../feedback/feedback-storage.service';

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
  constructor(
    private readonly photos: PhotosService,
    private readonly termsAck: PhotoTermsAckService,
    private readonly healthPhotoStorage: HealthPhotoStorageService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  /** F8.1: has this account acknowledged "Farm records only" yet? */
  @Get('terms-ack')
  getTermsAck(@CurrentUser() user) {
    return this.termsAck.ackedAt(user.id).then((ackedAt) => ({ ackedAt }));
  }

  /** F8.1: acknowledge once; idempotent, offline-safe (the app retries it later). */
  @Post('terms-ack')
  postTermsAck(@CurrentUser() user) {
    return this.termsAck.acknowledge(user.id);
  }

  /**
   * F5: one shared upload route for every new surface (money proof, input
   * label, identity, condition). `surface` picks the capability that gates
   * it and the `photo_objects.entity` tag; the per-record cap is enforced by
   * that record's own DTO, not here (this just stores one photo).
   */
  @Post('upload/pond/:pondId')
  @UseGuards(OwnershipGuard, DailyUploadCapGuard)
  @OwnsResource('Pond', 'pondId', 'farm.userId', 'READ')
  @Throttle(UPLOAD_THROTTLE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_HEALTH_PHOTO_BYTES } }))
  async uploadForPond(
    @Param('pondId', ParseUUIDPipe) pondId: string,
    @Query('surface') surfaceKey: string,
    @UploadedFile() file: UploadedImage,
    @CurrentUser() user,
  ) {
    const surface = this.requireSurface(surfaceKey, 'pond');
    const pond = await this.farmAccess.assertCanAccessPond(user.id, pondId, surface.capability);
    return { path: await this.healthPhotoStorage.upload(pond.farmId, file, user.id, pondId) };
  }

  @Post('upload/farm/:farmId')
  @UseGuards(OwnershipGuard, DailyUploadCapGuard)
  @OwnsResource('Farm', 'farmId', 'userId', 'READ')
  @Throttle(UPLOAD_THROTTLE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_HEALTH_PHOTO_BYTES } }))
  async uploadForFarm(
    @Param('farmId', ParseUUIDPipe) farmId: string,
    @Query('surface') surfaceKey: string,
    @UploadedFile() file: UploadedImage,
    @CurrentUser() user,
  ) {
    const surface = this.requireSurface(surfaceKey, 'farm');
    await this.farmAccess.assertCanAccessFarm(user.id, farmId, surface.capability);
    return { path: await this.healthPhotoStorage.upload(farmId, file, user.id) };
  }

  /**
   * F5: delete a not-yet-saved F5 upload — the farmer tapped ✕ before
   * submitting the form it belongs to. Mirrors
   * HealthObservationsController.removePhoto exactly (assertFarmPaths then
   * enqueue), scoped by pond instead of owner so it works even when the
   * upload counts against the farm owner's pool rather than the uploader's
   * (a worker's photo). A path already on a saved record is removed by that
   * record's own PATCH with the path dropped, never here.
   */
  @Delete('upload/pond/:pondId')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Pond', 'pondId', 'farm.userId', 'READ')
  async removeForPond(
    @Param('pondId', ParseUUIDPipe) pondId: string,
    @Body() dto: RemovePhotoDto,
    @CurrentUser() user,
  ) {
    const pond = await this.farmAccess.assertCanAccessPond(user.id, pondId, 'READ');
    this.healthPhotoStorage.assertFarmPaths(pond.farmId, [dto.path]);
    await this.healthPhotoStorage.remove([dto.path], 'photo_removed', user.id);
    return { removed: true };
  }

  @Delete('upload/farm/:farmId')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Farm', 'farmId', 'userId', 'READ')
  async removeForFarm(
    @Param('farmId', ParseUUIDPipe) farmId: string,
    @Body() dto: RemovePhotoDto,
    @CurrentUser() user,
  ) {
    this.healthPhotoStorage.assertFarmPaths(farmId, [dto.path]);
    await this.healthPhotoStorage.remove([dto.path], 'photo_removed', user.id);
    return { removed: true };
  }

  private requireSurface(key: string, scope: 'pond' | 'farm') {
    const surface = PHOTO_SURFACES[key as SurfaceKey];
    if (!surface || surface.scope !== scope) {
      throw new BadRequestException('Unknown photo surface');
    }
    return surface;
  }

  /**
   * F6: the pond Photos tab. A view over records (§2) — money rows are
   * dropped entirely without VIEW_FINANCIALS, never masked, since the row's
   * only content is the photo itself.
   */
  @Get('pond/:pondId')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Pond', 'pondId', 'farm.userId', 'READ')
  async feedForPond(
    @Param('pondId', ParseUUIDPipe) pondId: string,
    @CurrentUser() user,
    @Query('category') category?: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    const pond = await this.farmAccess.assertCanAccessPond(user.id, pondId, 'READ');
    let canViewFinancials = false;
    try {
      await this.farmAccess.assertCanAccessFarm(user.id, pond.farmId, 'VIEW_FINANCIALS');
      canViewFinancials = true;
    } catch {
      // stays false — worker/viewer without financial access
    }
    return this.photos.feedForPond(pondId, {
      canViewFinancials,
      category,
      before,
      limit: limit ? Number(limit) : undefined,
    });
  }

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
