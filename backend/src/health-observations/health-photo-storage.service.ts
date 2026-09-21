import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import {
  MAX_IMAGE_BYTES,
  R2StorageService,
  type UploadedImage,
} from '../storage/r2-storage.service';
import {
  PhotoDeletionService,
  type PhotoDeletionReason,
} from '../storage/photo-deletion.service';

/** The app compresses to ≤1600 px JPEG q0.7, well under this. */
export const MAX_HEALTH_PHOTO_BYTES = MAX_IMAGE_BYTES;

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

const PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/;

/**
 * Pond / mortality / disease photos, stored in R2 under `health/`.
 *
 * Paths are namespaced by FARM (`<farmId>/<uuid>.webp`), so a path proves which
 * farm it belongs to: writes reject another farm's paths and reads sign only
 * the record's own farm's paths. Access to the farm itself is checked by the
 * route that reaches here (OwnershipGuard + FarmAccessService).
 */
@Injectable()
export class HealthPhotoStorageService {
  constructor(
    private readonly storage: R2StorageService,
    private readonly deletions: PhotoDeletionService,
  ) {}

  upload(farmId: string, file: UploadedImage): Promise<string> {
    return this.storage.putImage('health', `${farmId}/${randomUUID()}`, file);
  }

  /**
   * F1: queue photo(s) (+ thumbnails) for deletion from R2. Pass the
   * transaction's `manager` when the record goes in the same transaction.
   * Never calls R2 in the request, so a storage outage cannot fail a delete.
   */
  async remove(
    paths: string[] | null | undefined,
    reason: PhotoDeletionReason,
    requestedBy?: string | null,
    manager?: EntityManager,
  ): Promise<void> {
    if (!paths?.length) return;
    await this.deletions.enqueue(
      paths.map((path) => ({ namespace: 'health' as const, path })),
      reason,
      requestedBy,
      manager,
    );
  }

  /** 403 unless every path is one of THIS farm's uploads. */
  assertFarmPaths(farmId: string, paths: string[] | undefined | null): void {
    if (!paths?.length) return;
    if (paths.some((p) => !PATH_RE.test(p) || !p.startsWith(`${farmId}/`))) {
      throw new ForbiddenException('Photo does not belong to this farm');
    }
  }

  /**
   * Signed, short-lived full + thumbnail URLs, in the same order as `paths`.
   * A path from another farm (or anything not a path) is dropped, never
   * signed. Degrades to [] on a storage failure: losing thumbnails beats
   * losing the record.
   */
  signForFarm(
    farmId: string,
    paths: string[] | null | undefined,
  ): Promise<{ full: string[]; thumb: string[] }> {
    const own = (paths ?? []).filter(
      (p) => PATH_RE.test(p) && p.startsWith(`${farmId}/`),
    );
    return this.storage.sign('health', own);
  }

  /** `photoSignedUrls` + `photoThumbUrls` on each record (signed locally). */
  async withSigned<T extends { photoUrls?: string[] | null }>(
    farmId: string,
    rows: T[],
  ): Promise<(T & { photoSignedUrls: string[]; photoThumbUrls: string[] })[]> {
    return Promise.all(
      rows.map(async (r) => {
        const { full, thumb } = await this.signForFarm(farmId, r.photoUrls);
        return { ...r, photoSignedUrls: full, photoThumbUrls: thumb };
      }),
    );
  }
}
