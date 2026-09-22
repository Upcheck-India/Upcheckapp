import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
// Type-only: r2-storage.service imports this file; a value import would be circular.
import type { PhotoNamespace } from './r2-storage.service';

/**
 * F2: the flat per-account pool — whichever limit is reached first. The app
 * shows only the photo count; `bytes` is a hidden backstop (a few oversized
 * photos cannot run up the bill) enforced the same way, same STORAGE_FULL.
 * Only farm photos (`health` namespace) count: avatars and feedback do not.
 * ponytail: one number in a constants file, not a column. Becomes a per-plan
 * column the day tiers exist (PD3).
 */
export const PHOTO_QUOTA = { photos: 500, bytes: 300 * 1024 ** 2 };

/** The one namespace that counts toward the pool (alias `o`). */
export const COUNTED = `o.namespace = 'health'`;

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

/** Admin photo-quota management: validation ceiling for a per-account override. */
export const QUOTA_OVERRIDE_LIMITS = { maxPhotos: 100_000, maxBytes: 200 * 1024 ** 3 };

export interface QuotaOverride extends Quota {
  reason: string;
  setBy: string;
  setAt: string;
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

  private anyDropped: { value: boolean; at: number } | null = null;

  /**
   * F3: which of `paths` have had their full-size object dropped (only the
   * thumbnail is left). Runs on every sign(), so it is skipped entirely while
   * no photo anywhere has been downgraded — a single EXISTS, re-checked every
   * 10 minutes. Never throws: a failed lookup just means "none dropped".
   * ponytail: one query per sign() once downgrades exist; batch per list if it shows up in timings.
   */
  async droppedAmong(namespace: PhotoNamespace, paths: string[]): Promise<Set<string>> {
    const none = new Set<string>();
    if (!paths.length) return none;
    try {
      if (!this.anyDropped || Date.now() - this.anyDropped.at > 10 * 60_000) {
        const [row] = await this.db.query(
          `SELECT EXISTS (SELECT 1 FROM photo_objects WHERE full_dropped_at IS NOT NULL) AS any`,
        );
        this.anyDropped = { value: !!row?.any, at: Date.now() };
      }
      if (!this.anyDropped.value) return none;
      const rows: { path: string }[] = await this.db.query(
        `SELECT path FROM photo_objects WHERE namespace = $1 AND path = ANY($2::text[]) AND full_dropped_at IS NOT NULL`,
        [namespace, paths],
      );
      return new Set(rows.map((r) => r.path));
    } catch (err: any) {
      if (!isMissingSchema(err)) this.logger.warn(`Could not read dropped photos: ${err?.message ?? err}`);
      return none;
    }
  }

  /** Retention just dropped something: stop assuming nothing is. */
  markDropped(): void {
    this.anyDropped = { value: true, at: Date.now() };
  }

  /** The account a farm's photos count against: its current owner. */
  async ownerOfFarm(farmId: string): Promise<string | null> {
    const [row] = await this.db.query(`SELECT user_id FROM farms WHERE id = $1`, [farmId]);
    return row?.user_id ?? null;
  }

  /**
   * The ONE place an account's limit is read — used inside `record()`'s
   * per-owner advisory lock, so this must stay cheap and never throw for a
   * missing table. Admin photo-quota management: a row in
   * `photo_quota_overrides` wins over the flat PHOTO_QUOTA default; no row
   * (or the table not migrated yet) falls back to the default, logged once
   * via `isMissingSchema` the same as every other ledger read.
   */
  async quotaFor(ownerUserId: string): Promise<Quota> {
    try {
      const [row] = await this.db.query(
        `SELECT max_photos, max_bytes FROM photo_quota_overrides WHERE user_id = $1`,
        [ownerUserId],
      );
      if (row) return { maxPhotos: Number(row.max_photos), maxBytes: Number(row.max_bytes) };
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
    }
    return { maxPhotos: PHOTO_QUOTA.photos, maxBytes: PHOTO_QUOTA.bytes };
  }

  /** The override row for one account, or null when it has none / isn't migrated. */
  async getOverride(ownerUserId: string): Promise<QuotaOverride | null> {
    try {
      const [row] = await this.db.query(
        `SELECT max_photos, max_bytes, reason, set_by, set_at FROM photo_quota_overrides WHERE user_id = $1`,
        [ownerUserId],
      );
      if (!row) return null;
      return {
        maxPhotos: Number(row.max_photos),
        maxBytes: Number(row.max_bytes),
        reason: row.reason,
        setBy: row.set_by,
        setAt: row.set_at,
      };
    } catch (err) {
      if (isMissingSchema(err)) return null;
      throw err;
    }
  }

  /**
   * Set (insert or replace) an account's override and append the event —
   * one transaction, so a crash between the two never loses the audit trail
   * for a limit that did in fact change. Fail-safe: throws ForbiddenException
   * with a clear message when the table isn't migrated yet, rather than
   * silently doing nothing (unlike a read, an admin mutation should not look
   * like it worked when it didn't).
   */
  async setOverride(
    ownerUserId: string,
    quota: Quota,
    reason: string,
    setBy: string,
  ): Promise<QuotaOverride> {
    try {
      return await this.db.transaction(async (m) => {
        const [row] = await m.query(
          `INSERT INTO photo_quota_overrides (user_id, max_photos, max_bytes, reason, set_by, set_at)
           VALUES ($1, $2, $3, $4, $5, now())
           ON CONFLICT (user_id) DO UPDATE
             SET max_photos = EXCLUDED.max_photos, max_bytes = EXCLUDED.max_bytes,
                 reason = EXCLUDED.reason, set_by = EXCLUDED.set_by, set_at = EXCLUDED.set_at
           RETURNING max_photos, max_bytes, reason, set_by, set_at`,
          [ownerUserId, quota.maxPhotos, quota.maxBytes, reason, setBy],
        );
        await m.query(
          `INSERT INTO photo_quota_override_events (user_id, action, max_photos, max_bytes, reason, set_by)
           VALUES ($1, 'set', $2, $3, $4, $5)`,
          [ownerUserId, quota.maxPhotos, quota.maxBytes, reason, setBy],
        );
        return {
          maxPhotos: Number(row.max_photos),
          maxBytes: Number(row.max_bytes),
          reason: row.reason,
          setBy: row.set_by,
          setAt: row.set_at,
        };
      });
    } catch (err) {
      if (isMissingSchema(err)) {
        this.logger.warn('photo_quota_overrides not migrated; override was not saved.');
        throw new ForbiddenException(
          'Photo quota overrides are not available yet (migration not applied).',
        );
      }
      throw err;
    }
  }

  /** Back to the flat default — removes the override row, keeps the event trail. */
  async resetOverride(ownerUserId: string, reason: string, setBy: string): Promise<void> {
    try {
      await this.db.transaction(async (m) => {
        await m.query(`DELETE FROM photo_quota_overrides WHERE user_id = $1`, [ownerUserId]);
        await m.query(
          `INSERT INTO photo_quota_override_events (user_id, action, max_photos, max_bytes, reason, set_by)
           VALUES ($1, 'reset', NULL, NULL, $2, $3)`,
          [ownerUserId, reason, setBy],
        );
      });
    } catch (err) {
      if (isMissingSchema(err)) {
        this.logger.warn('photo_quota_overrides not migrated; reset was a no-op.');
        return;
      }
      throw err;
    }
  }

  /** Full history for an account, newest first — the audit trail for §2. */
  async overrideHistory(ownerUserId: string): Promise<
    { action: string; maxPhotos: number | null; maxBytes: number | null; reason: string; setBy: string; createdAt: string }[]
  > {
    try {
      const rows = await this.db.query(
        `SELECT action, max_photos, max_bytes, reason, set_by, created_at
         FROM photo_quota_override_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [ownerUserId],
      );
      return rows.map((r: any) => ({
        action: r.action,
        maxPhotos: r.max_photos === null ? null : Number(r.max_photos),
        maxBytes: r.max_bytes === null ? null : Number(r.max_bytes),
        reason: r.reason,
        setBy: r.set_by,
        createdAt: r.created_at,
      }));
    } catch (err) {
      if (isMissingSchema(err)) return [];
      throw err;
    }
  }

  /** Live photos + bytes in `ownerUserId`'s pool. Null before the migration. */
  async usageOf(ownerUserId: string, manager?: EntityManager): Promise<Usage | null> {
    try {
      const [row] = await (manager ?? this.db).query(
        `SELECT count(*)::int AS photos, COALESCE(sum(${LIVE_BYTES}), 0)::bigint AS bytes
         FROM photo_objects o WHERE o.owner_user_id = $1 AND ${COUNTED} AND ${NOT_PENDING}`,
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
    // Avatars and feedback never count, so they are never refused for a full pool.
    const counted = namespace === 'health';
    const q = counted ? await this.quotaFor(owner.ownerUserId) : null;
    try {
      await this.db.transaction(async (m) => {
        if (q) {
          await m.query(`SELECT pg_advisory_xact_lock(hashtextextended('photo_quota:' || $1, 0))`, [
            owner.ownerUserId,
          ]);
          const used = await this.usageOf(owner.ownerUserId, m);
          if (used && (used.photos + 1 > q.maxPhotos || used.bytes + bytesFull + bytesThumb > q.maxBytes)) {
            throw storageFull();
          }
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
