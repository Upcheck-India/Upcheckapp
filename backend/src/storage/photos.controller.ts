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
import { IsIn, IsString, IsUUID, MaxLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { PhotosService } from './photos.service';

export class FreeUpDto {
  @IsIn(['crop', 'pond'])
  kind: 'crop' | 'pond';

  @IsUUID()
  id: string;
}

export class RemovePhotoDto {
  @IsString()
  @MaxLength(200)
  path: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
