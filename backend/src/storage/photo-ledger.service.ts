import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
// Type-only: r2-storage.service imports this file; a value import would be circular.
import type { PhotoNamespace } from './r2-storage.service';

/**
 * F2: the flat per-account pool — whichever limit is reached first.
 * ponytail: one number in a constants file, not a column. Becomes a per-plan
 * column the day tiers exist (PD3).
 */
export const PHOTO_QUOTA = { photos: 1000, bytes: Math.round(1.5 * 1024 ** 3) };

/** Who an upload counts against, and what it is attached to (if known yet). */
export interface LedgerOwner {
  /** The account whose pool this counts against (farm owner; uploader for avatars/feedback). */
  ownerUserId: string;
  uploadedBy: string;
  farmId?: string | null;
  pondId?: string | null;
  entity?: string | null;
  recordId?: string | null;
}

export interface Usage {
  photos: number;
  bytes: number;
}

export interface Quota {
  maxPhotos: number;
  maxBytes: number;
}

const storageFull = () =>
  new ForbiddenException({ statusCode: 403, code: 'STORAGE_FULL', message: 'Storage full — free up space' });

/**
 * Bytes a ledger row costs right now: after F3 drops the full size only the
 * thumbnail counts. Alias the table `o`.
 */
export const LIVE_BYTES = `(CASE WHEN o.full_dropped_at IS NULL THEN o.bytes_full + o.bytes_thumb ELSE o.bytes_thumb END)`;

/**
 * Not already queued for deletion (exact path or a `<owner>/` prefix) — a
 * cleared photo stops counting the moment it is queued, not when the drain
 * gets to it. A retention downgrade keeps the thumbnail, so it still counts.
 */
export const NOT_PENDING = `NOT EXISTS (
  SELECT 1 FROM photo_deletions d
  WHERE d.done_at IS NULL AND d.reason <> 'retention_full' AND d.namespace = o.namespace
    AND (d.path = o.path OR (right(d.path, 1) = '/' AND starts_with(o.path, d.path))))`;

const isMissingSchema = (err: any) =>
  ['42P01', '42703'].includes(err?.code ?? err?.driverError?.code);

/**
 * `photo_objects`: one row per stored photo, so an account's usage is a SUM
 * instead of an R2 listing. Every method degrades (logged) while the table is
 * not migrated: uploads then skip the ledger and the quota rather than fail.
 */
@Injectable()
export class PhotoLedgerService {
  private readonly logger = new Logger(PhotoLedgerService.name);

  constructor(private readonly db: DataSource) {}

  /** The account a farm's photos count against: its current owner. */
  async ownerOfFarm(farmId: string): Promise<string | null> {
    const [row] = await this.db.query(`SELECT user_id FROM farms WHERE id = $1`, [farmId]);
    return row?.user_id ?? null;
  }

  /**
   * The ONE place an account's limit is read. Today the flat PHOTO_QUOTA for
   * everyone; per-user overrides / plans plug in here.
   */
  async quotaFor(_ownerUserId: string): Promise<Quota> {
    return { maxPhotos: PHOTO_QUOTA.photos, maxBytes: PHOTO_QUOTA.bytes };
  }

  /** Live photos + bytes in `ownerUserId`'s pool. Null before the migration. */
  async usageOf(ownerUserId: string, manager?: EntityManager): Promise<Usage | null> {
    try {
      const [row] = await (manager ?? this.db).query(
        `SELECT count(*)::int AS photos, COALESCE(sum(${LIVE_BYTES}), 0)::bigint AS bytes
         FROM photo_objects o WHERE o.owner_user_id = $1 AND ${NOT_PENDING}`,
        [ownerUserId],
      );
      return { photos: Number(row?.photos ?? 0), bytes: Number(row?.bytes ?? 0) };
    } catch (err) {
      if (isMissingSchema(err)) return null;
      throw err;
    }
  }

  /**
   * Server-side quota (F2), the cheap pre-check before anything is uploaded:
   * a full account does not upload at all. Never called on a record save, so
   * a full pool can never block logging. The guarantee is `record`, not this.
   */
  async assertRoom(ownerUserId: string): Promise<void> {
    const used = await this.usageOf(ownerUserId);
    if (!used) return;
    const q = await this.quotaFor(ownerUserId);
    if (used.photos >= q.maxPhotos || used.bytes >= q.maxBytes) throw storageFull();
  }

  /**
   * Ledger row for a just-stored photo, admitted ATOMICALLY per account: a
   * transaction-scoped advisory lock on the owner serialises concurrent
   * uploads, usage is re-summed under it, and the row goes in only if this
   * photo still fits. Otherwise 403 STORAGE_FULL with nothing written, and
   * the caller deletes the objects it just put.
   *
   * Returns false (logged) when the table is not migrated; any other failure
   * throws so the caller can undo the put.
   */
  async record(
    namespace: PhotoNamespace,
    path: string,
    owner: LedgerOwner,
    bytesFull: number,
    bytesThumb: number,
  ): Promise<boolean> {
    const q = await this.quotaFor(owner.ownerUserId);
    try {
      await this.db.transaction(async (m) => {
        await m.query(`SELECT pg_advisory_xact_lock(hashtextextended('photo_quota:' || $1, 0))`, [
          owner.ownerUserId,
        ]);
        const used = await this.usageOf(owner.ownerUserId, m);
        if (used && (used.photos + 1 > q.maxPhotos || used.bytes + bytesFull + bytesThumb > q.maxBytes)) {
          throw storageFull();
        }
        await m.query(
          `INSERT INTO photo_objects
             (path, namespace, owner_user_id, farm_id, pond_id, entity, record_id, bytes_full, bytes_thumb, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (path) DO NOTHING`,
          [
            path,
            namespace,
            owner.ownerUserId,
            owner.farmId ?? null,
            owner.pondId ?? null,
            owner.entity ?? null,
            owner.recordId ?? null,
            bytesFull,
            bytesThumb,
            owner.uploadedBy,
          ],
        );
      });
      return true;
    } catch (err: any) {
      if (isMissingSchema(err)) {
        this.logger.warn(`photo_objects not migrated; ${namespace}/${path} is not in the ledger`);
        return false;
      }
      throw err;
    }
  }

  /**
   * The record that uses these photos has saved: stamp it on their rows so
   * they are no longer orphans and the breakdown can name the record. Only
   * unattached rows move — a later edit of the same record changes nothing.
   * Logged, never thrown: the record is already saved.
   */
  async attach(
    namespace: PhotoNamespace,
    paths: string[] | null | undefined,
    link: { entity: string; recordId: string; cropId?: string | null },
  ): Promise<void> {
    if (!paths?.length) return;
    try {
      await this.db.query(
        `UPDATE photo_objects
         SET entity = $3, record_id = $4, crop_id = COALESCE($5, crop_id)
         WHERE namespace = $1 AND path = ANY($2::text[]) AND record_id IS NULL`,
        [namespace, paths, link.entity, link.recordId, link.cropId ?? null],
      );
    } catch (err: any) {
      if (isMissingSchema(err)) return;
      this.logger.error(
        `Could not attach ${namespace} photo(s) ${paths.join(', ')} to ${link.entity} ${link.recordId}: ${err?.message ?? err}`,
      );
    }
  }
}
