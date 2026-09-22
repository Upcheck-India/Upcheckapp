import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FeedbackService } from './feedback.service';
import {
  FeedbackStorageService,
  MAX_ATTACHMENT_BYTES,
  type UploadedImage,
} from './feedback-storage.service';
import { UPLOAD_THROTTLE } from '../storage/r2-storage.service';
import { DailyUploadCapGuard } from '../storage/daily-upload-cap.guard';
import { CreateFeedbackDto, ReportPhotoDto } from './dto/feedback.dto';

/**
 * The farmer's side of feedback. Every route is scoped to the caller — there
 * is no route here that can name another user's report.
 */
@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly feedback: FeedbackService,
    private readonly storage: FeedbackStorageService,
  ) {}

  /**
   * Upload one image, get back its storage path.
   *
   * Separate from create so a failed photo on a rural connection costs the
   * farmer that photo, not the whole report they just typed out.
   */
  @Post('attachment')
  @Throttle(UPLOAD_THROTTLE)
  @UseGuards(DailyUploadCapGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_BYTES } }),
  )
  async uploadAttachment(
    @UploadedFile() file: UploadedImage,
    @CurrentUser() user,
  ) {
    return { path: await this.storage.upload(user.id, file) };
  }

  @Post()
  create(@Body() dto: CreateFeedbackDto, @CurrentUser() user) {
    return this.feedback.create(user.id, dto);
  }

  /** F7.8: report a farm photo someone else uploaded (path referenced, not copied). */
  @Post('report-photo')
  @Throttle(UPLOAD_THROTTLE)
  reportPhoto(@Body() dto: ReportPhotoDto, @CurrentUser() user) {
    return this.feedback.reportPhoto(user.id, dto);
  }

  @Get()
  mine(@CurrentUser() user) {
    return this.feedback.findMine(user.id);
  }

  @Get(':id')
  one(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user) {
    return this.feedback.findOneMine(user.id, id);
  }
}
