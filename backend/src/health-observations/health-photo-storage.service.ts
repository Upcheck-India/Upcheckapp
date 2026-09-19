import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import type { UploadedImage } from '../feedback/feedback-storage.service';

/**
 * Private bucket. Created once by hand before deploy (SQL in the D6 PR,
 * same shape as `feedback-attachments`, admin/README.md).
 */
export const HEALTH_BUCKET = 'health-photos';

/** The app compresses to ≤1600 px JPEG q0.7, well under this. */
export const MAX_HEALTH_PHOTO_BYTES = 5 * 1024 * 1024;

/** The farm a crop belongs to — the namespace its records' photos live in. */
export async function farmIdOfCrop(
  manager: EntityManager,
  cropId: string,
): Promise<string | null> {
  const [row] = await manager.query(
    `SELECT p.farm_id FROM crops c JOIN ponds p ON p.id = c.pond_id WHERE c.id = $1`,
    [cropId],
  );
  return row?.farm_id ?? null;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/;

/**
 * Pond / mortality / disease photos, following FeedbackStorageService.
 *
 * Paths are namespaced by FARM (`<farmId>/<uuid>.jpg`), so a path proves which
 * farm it belongs to: writes reject another farm's paths and reads sign only
 * the record's own farm's paths. Access to the farm itself is checked by the
 * route that reaches here (OwnershipGuard + FarmAccessService).
 */
@Injectable()
export class HealthPhotoStorageService {
  private readonly logger = new Logger(HealthPhotoStorageService.name);
  private readonly client: SupabaseClient | null;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const serviceKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    // Own service-role client, for the reason spelled out in FeedbackStorageService.
    this.client =
      url && serviceKey
        ? createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : null;
  }

  async upload(farmId: string, file: UploadedImage): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('Photos are not available');
    }
    if (!file?.buffer?.length) throw new BadRequestException('Empty file');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported image type: ${file.mimetype}`);
    }
    if (file.size > MAX_HEALTH_PHOTO_BYTES) {
      throw new BadRequestException('Image is too large');
    }
    const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const path = `${farmId}/${randomUUID()}.${ext}`;
    const { error } = await this.client.storage
      .from(HEALTH_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) {
      this.logger.error(`Health photo upload failed: ${error.message}`);
      throw new ServiceUnavailableException('Could not store the image');
    }
    return path;
  }

  /** 403 unless every path is one of THIS farm's uploads. */
  assertFarmPaths(farmId: string, paths: string[] | undefined | null): void {
    if (!paths?.length) return;
    if (paths.some((p) => !PATH_RE.test(p) || !p.startsWith(`${farmId}/`))) {
      throw new ForbiddenException('Photo does not belong to this farm');
    }
  }

  /**
   * Signed, short-lived URLs, in the same order as `paths`. A path from
   * another farm (or anything not a path) is dropped, never signed. Degrades
   * to [] on a Storage failure: losing thumbnails beats losing the record.
   */
  async signForFarm(farmId: string, paths: string[] | null | undefined): Promise<string[]> {
    const own = (paths ?? []).filter(
      (p) => PATH_RE.test(p) && p.startsWith(`${farmId}/`),
    );
    if (!this.client || !own.length) return [];
    try {
      const { data, error } = await this.client.storage
        .from(HEALTH_BUCKET)
        .createSignedUrls(own, 3600);
      if (error) throw error;
      return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u);
    } catch (err: any) {
      this.logger.warn(`Could not sign health photos: ${err?.message ?? err}`);
      return [];
    }
  }

  /** `photoSignedUrls` on each record, one Storage call per record. */
  async withSigned<T extends { photoUrls?: string[] | null }>(
    farmId: string,
    rows: T[],
  ): Promise<(T & { photoSignedUrls: string[] })[]> {
    return Promise.all(
      rows.map(async (r) => ({
        ...r,
        photoSignedUrls: await this.signForFarm(farmId, r.photoUrls),
      })),
    );
  }
}
