import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MAX_IMAGE_BYTES, UPLOAD_THROTTLE, type UploadedImage } from '../storage/r2-storage.service';
import { AvatarService } from './avatar.service';
import { DailyUploadCapGuard } from '../storage/daily-upload-cap.guard';

export class AvatarVisibilityDto {
  @IsBoolean()
  showAvatarToTeam: boolean;
}

/**
 * The caller's own profile picture. No route names another user: the owner
 * is always the session, and the stored path is minted server side.
 */
@Controller('profiles/me')
export class AvatarsController {
  constructor(private readonly avatars: AvatarService) {}

  @Get('avatar')
  mine(@CurrentUser() user) {
    return this.avatars.mine(user.id);
  }

  @Post('avatar')
  @Throttle(UPLOAD_THROTTLE)
  @UseGuards(DailyUploadCapGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  upload(@UploadedFile() file: UploadedImage, @CurrentUser() user) {
    return this.avatars.upload(user.id, file);
  }

  @Delete('avatar')
  remove(@CurrentUser() user) {
    return this.avatars.remove(user.id);
  }

  @Patch('avatar-visibility')
  setVisibility(@Body() dto: AvatarVisibilityDto, @CurrentUser() user) {
    return this.avatars.setVisibility(user.id, dto.showAvatarToTeam);
  }
}
