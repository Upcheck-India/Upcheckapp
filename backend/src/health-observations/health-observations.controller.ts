import {
  Body,
  Controller,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { HealthObservationsService } from './health-observations.service';
import { CreateHealthObservationsDto } from './dto/create-health-observations.dto';
import { MAX_HEALTH_PHOTO_BYTES } from './health-photo-storage.service';
import type { UploadedImage } from '../feedback/feedback-storage.service';

/**
 * Health observations (spec D6). Route guard AND service-level
 * `assertCanAccessPond` (which also applies pond scoping), same capability.
 * Workers observe, so writes are WRITE_OPERATIONAL.
 */
@Controller('health-observations')
export class HealthObservationsController {
  constructor(private readonly service: HealthObservationsService) {}

  @Post()
  @UseGuards(OwnershipGuard)
  @OwnsResource('Pond', 'pondId', 'farm.userId', 'WRITE_OPERATIONAL')
  create(@Body() dto: CreateHealthObservationsDto, @CurrentUser() user) {
    return this.service.create(dto, user.id);
  }

  @Get('pond/:pondId')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Pond', 'pondId', 'farm.userId', 'READ')
  list(
    @Param('pondId', ParseUUIDPipe) pondId: string,
    @CurrentUser() user,
    @Query('days') days?: string,
  ) {
    const n = Math.min(90, Math.max(0, Number(days) || 3));
    return this.service.listForPond(pondId, user.id, n);
  }

  /**
   * One photo for a pond's health record (observation, mortality or disease).
   * The pond is in the PATH: multipart body fields are parsed after guards run.
   * Online only — the app disables the button offline.
   */
  @Post('photos/:pondId')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Pond', 'pondId', 'farm.userId', 'WRITE_OPERATIONAL')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_HEALTH_PHOTO_BYTES } }),
  )
  uploadPhoto(
    @Param('pondId', ParseUUIDPipe) pondId: string,
    @UploadedFile() file: UploadedImage,
    @CurrentUser() user,
  ) {
    return this.service.uploadPhoto(pondId, user.id, file);
  }
}
