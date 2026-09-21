import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MAX_IMAGE_BYTES,
  R2StorageService,
  type UploadedImage,
} from '../storage/r2-storage.service';
import { PhotoLedgerService } from '../storage/photo-ledger.service';

export type { UploadedImage } from '../storage/r2-storage.service';

/** F7.8: marks a report attachment that is a farm photo referenced in place. */
export const REPORTED_PHOTO_PREFIX = 'health/';

/** 5 MB per image after the picker's on-device compression. */
export const MAX_ATTACHMENT_BYTES = MAX_IMAGE_BYTES;

/** Feedback screenshots, stored in R2 under `feedback/`. */
@Injectable()
export class FeedbackStorageService {
  constructor(
    private readonly storage: R2StorageService,
    @Optional() private readonly ledger?: PhotoLedgerService,
  ) {}

  /**
   * Store one image and return its object PATH.
   *
   * Paths are namespaced by user id (`<userId>/<uuid>.webp`) so ownership is
   * checkable from the path alone — that is what
   * `FeedbackService.assertOwnsPaths` relies on when the client hands paths
   * back on create.
   */
  upload(userId: string, file: UploadedImage): Promise<string> {
    // F2: counts against the reporter's own pool.
    return this.storage.putImage('feedback', `${userId}/${randomUUID()}`, file, {
      ownerUserId: userId,
      uploadedBy: userId,
    });
  }

  /** F2: the report saved — its screenshots are no longer orphans. */
  attach(paths: string[], reportId: string): Promise<void> {
    return this.ledger?.attach('feedback', paths, { entity: 'feedback', recordId: reportId }) ?? Promise.resolve();
  }

  /**
   * Signed, short-lived full + thumbnail URLs for a report's attachments.
   *
   * F7.8: an attachment starting `health/` is a REPORTED farm photo,
   * referenced in place (never copied). Only staff (`includeReported`) get it
   * signed; the reporter's own view leaves it out, so a member later removed
   * from the farm cannot keep reading the photo through their report.
   * Own screenshots first, then reported photos.
   *
   * Degrades to empty lists rather than throwing: a farmer must still be able
   * to read the team's reply when storage is having a bad day.
   */
  async signAttachments(
    paths: string[],
    includeReported = false,
  ): Promise<{ full: string[]; thumb: string[] }> {
    const all = paths ?? [];
    const own = all.filter((p) => !p.startsWith(REPORTED_PHOTO_PREFIX));
    const reported = includeReported
      ? all.filter((p) => p.startsWith(REPORTED_PHOTO_PREFIX)).map((p) => p.slice(REPORTED_PHOTO_PREFIX.length))
      : [];
    const [a, b] = await Promise.all([
      this.storage.sign('feedback', own),
      reported.length ? this.storage.sign('health', reported) : { full: [], thumb: [] },
    ]);
    return { full: [...a.full, ...b.full], thumb: [...a.thumb, ...b.thumb] };
  }
}
