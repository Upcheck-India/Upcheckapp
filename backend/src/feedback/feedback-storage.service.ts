import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MAX_IMAGE_BYTES,
  R2StorageService,
  type UploadedImage,
} from '../storage/r2-storage.service';

export type { UploadedImage } from '../storage/r2-storage.service';

/** 5 MB per image after the picker's on-device compression. */
export const MAX_ATTACHMENT_BYTES = MAX_IMAGE_BYTES;

/** Feedback screenshots, stored in R2 under `feedback/`. */
@Injectable()
export class FeedbackStorageService {
  constructor(private readonly storage: R2StorageService) {}

  /**
   * Store one image and return its object PATH.
   *
   * Paths are namespaced by user id (`<userId>/<uuid>.webp`) so ownership is
   * checkable from the path alone — that is what
   * `FeedbackService.assertOwnsPaths` relies on when the client hands paths
   * back on create.
   */
  upload(userId: string, file: UploadedImage): Promise<string> {
    return this.storage.putImage('feedback', `${userId}/${randomUUID()}`, file);
  }

  /**
   * Signed, short-lived full + thumbnail URLs for a report's attachments.
   *
   * Degrades to empty lists rather than throwing: a farmer must still be able
   * to read the team's reply when storage is having a bad day.
   */
  signAttachments(paths: string[]): Promise<{ full: string[]; thumb: string[] }> {
    return this.storage.sign('feedback', paths ?? []);
  }
}
