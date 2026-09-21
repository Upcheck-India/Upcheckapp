import { Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { R2StorageService, type PhotoNamespace } from './r2-storage.service';
import { NOT_PENDING, PhotoLedgerService } from './photo-ledger.service';
import { FULL_RETENTION_DAYS, NOTICE_LEAD_DAYS, retentionDropAt } from './retention';

export type PhotoDeletionReason =
  | 'record_deleted'
  | 'photo_removed'
  | 'pond_deleted'
  | 'cycle_deleted'
  | 'farm_deleted'
  | 'account_deleted'
  | 'retention_full'
  | 'user_cleared'
  | 'orphan';

/** `path` relative to the namespace; ending in `/` = everything under it. */
export interface PhotoRef {
  namespace: PhotoNamespace;
  path: string;
}

/** Automatic retries stop here; the row stays, surfaced to staff. */
export const MAX_AUTO_ATTEMPTS = 5;
const LAZY_DRAIN_EVERY_MS = 60_000;
/** F3: the retention pass rides the same lazy hook, at most daily per instance. */
const RETENTION_EVERY_MS = 24 * 3_600_000;
/** An upload still on no record after this long was abandoned (F1 orphans). */
export const ORPHAN_AFTER_HOURS = 24;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
// A prefix is exactly one owner segment. Never '' or '/': that would be the
// whole namespace.
const PREFIX_RE = new RegExp(`^${UUID}/$`);
const FILE_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/;

const isPrefix = (path: string) => path.endsWith('/');
const validRef = (r: PhotoRef) =>
  isPrefix(r.path) ? PREFIX_RE.test(r.path) : FILE_RE.test(r.path);

const isMissingTable = (err: any) =>
  (err?.code ?? err?.driverError?.code) === '42P01';
const isMissingSchema = (err: any) =>
  ['42P01', '42703'].includes(err?.code ?? err?.driverError?.code);

interface Row {
  id: string;
  namespace: PhotoNamespace;
  path: string;
  reason?: PhotoDeletionReason;
}

/**
 * F1: deletion that actually deletes. R2 is never called inside the request
 * that deletes a record — a failed R2 call must not fail the farmer's delete,
 * and a lost delete must not be forgotten. So the intent is written to
 * `photo_deletions` (in the caller's transaction) and drained later.
 *
 * Draining is lazy (Render's free plan sleeps, so @Cron is unreliable): each
 * alert-center build kicks `drainSoon()`, and staff can run a big sweep from
 * `POST /admin/photos/drain`.
 */
@Injectable()
export class PhotoDeletionService {
  private readonly logger = new Logger(PhotoDeletionService.name);
  private migrated = false;
  private draining = false;
  private lastLazyDrain = 0;
  private lastRetention = 0;

  constructor(
    private readonly db: DataSource,
    private readonly storage: R2StorageService,
    @Optional() private readonly ledger?: PhotoLedgerService,
  ) {}

  /**
   * Record the intent to delete `refs`. Pass the transaction's `manager` so
   * the intent commits (or rolls back) with the delete itself.
   *
   * Returns false when `photo_deletions` is not migrated yet (logged, never
   * thrown). In that case, and only outside a transaction, it falls back to
   * the pre-F1 behaviour: one best-effort inline delete. Inside a transaction
   * it does not, since the delete might still roll back.
   */
  async enqueue(
    refs: PhotoRef[],
    reason: PhotoDeletionReason,
    requestedBy?: string | null,
    manager?: EntityManager,
  ): Promise<boolean> {
    const bad = refs.filter((r) => !validRef(r));
    if (bad.length) {
      this.logger.error(
        `Refusing to enqueue malformed photo path(s): ${bad.map((r) => `${r.namespace}/${r.path}`).join(', ')}`,
      );
    }
    const good = [
      ...new Map(
        refs.filter(validRef).map((r) => [`${r.namespace}/${r.path}`, r]),
      ).values(),
    ];
    if (!good.length) return true;

    const m = manager ?? this.db.manager;
    if (!(await this.isMigrated(m))) {
      const keys = good.map((r) => `${r.namespace}/${r.path}`).join(', ');
      if (manager) {
        this.logger.warn(
          `photo_deletions not migrated; left in R2 (${reason}): ${keys}`,
        );
      } else {
        this.logger.warn(
          `photo_deletions not migrated; deleting inline (${reason}): ${keys}`,
        );
        for (const r of good) {
          await this.deleteRef(r).catch((err: any) =>
            this.logger.warn(
              `Inline delete failed for ${r.namespace}/${r.path}: ${err?.message ?? err}`,
            ),
          );
        }
      }
      return false;
    }

    await m.query(
      `INSERT INTO photo_deletions (namespace, path, reason, requested_by)
       SELECT ns, p, $3, $4 FROM unnest($1::text[], $2::text[]) AS t(ns, p)
       ON CONFLICT (namespace, path, reason) DO NOTHING`,
      [
        good.map((r) => r.namespace),
        good.map((r) => r.path),
        reason,
        requestedBy ?? null,
      ],
    );
    return true;
  }

  /**
   * `health/` refs for the paths a `SELECT unnest(photo_urls) AS path …`
   * returns — what a pond or cycle delete is about to cascade away. Run it
   * BEFORE the delete's transaction: an unmigrated photo column yields []
   * (logged) instead of aborting the transaction.
   */
  async healthRefs(sql: string, params: unknown[]): Promise<PhotoRef[]> {
    try {
      const rows: { path: string | null }[] = await this.db.query(sql, params);
      return rows
        .filter((r) => !!r.path)
        .map((r) => ({ namespace: 'health' as const, path: r.path! }));
    } catch (err: any) {
      if (['42P01', '42703'].includes(err?.code ?? err?.driverError?.code)) {
        this.logger.warn(`Photo columns not migrated; nothing to queue: ${err?.message}`);
        return [];
      }
      throw err;
    }
  }

  /**
   * Fire-and-forget orphan sweep + drain, at most once a minute per instance;
   * the F3 retention pass joins it at most once a day.
   */
  drainSoon(): void {
    const now = Date.now();
    if (now - this.lastLazyDrain < LAZY_DRAIN_EVERY_MS) return;
    this.lastLazyDrain = now;
    const retention = now - this.lastRetention >= RETENTION_EVERY_MS;
    if (retention) this.lastRetention = now;
    void this.sweepOrphans()
      .then(() => (retention ? this.retentionPass() : 0))
      .then(() => this.drain())
      .catch((err: any) =>
      this.logger.warn(`Lazy photo drain failed: ${err?.message ?? err}`),
    );
  }

  /**
   * Delete up to `limit` queued objects from R2. Success stamps `done_at`;
   * failure bumps `attempts`, keeps `last_error` and backs off exponentially
   * (1 min · 2^attempts, capped at a day). A row is never removed.
   *
   * `includeFailed` (staff sweep) also retries rows past MAX_AUTO_ATTEMPTS and
   * ignores the backoff.
   */
  async drain(
    limit = 100,
    { includeFailed = false } = {},
  ): Promise<{ deleted: number; failed: number }> {
    const out = { deleted: 0, failed: 0 };
    if (!this.storage.configured || this.draining) return out;
    this.draining = true;
    try {
      let rows: Row[];
      try {
        rows = await this.db.query(
          includeFailed
            ? `SELECT id, namespace, path, reason FROM photo_deletions
               WHERE done_at IS NULL ORDER BY requested_at LIMIT $1`
            : `SELECT id, namespace, path, reason FROM photo_deletions
               WHERE done_at IS NULL AND attempts < ${MAX_AUTO_ATTEMPTS} AND next_attempt_at <= now()
               ORDER BY requested_at LIMIT $1`,
          [limit],
        );
      } catch (err) {
        if (isMissingTable(err)) return out;
        throw err;
      }
      // ponytail: one R2 call per row, so each row gets its own outcome. Batch
      // into DeleteObjects (1000 keys) if a drain of 100 ever gets slow.
      for (const row of rows) {
        try {
          if (row.reason === 'retention_full') {
            // F3: the full size goes; the thumbnail and the ledger row stay.
            await this.storage.deleteFull(row.namespace, row.path);
          } else {
            await this.deleteRef(row);
            await this.forgetLedger(row);
          }
          await this.db.query(
            `UPDATE photo_deletions SET done_at = now(), attempts = attempts + 1, last_error = NULL WHERE id = $1`,
            [row.id],
          );
          out.deleted++;
        } catch (err: any) {
          out.failed++;
          await this.db.query(
            `UPDATE photo_deletions
             SET attempts = attempts + 1, last_error = $2,
                 next_attempt_at = now() + LEAST(interval '1 minute' * power(2, attempts), interval '1 day')
             WHERE id = $1`,
            [row.id, String(err?.message ?? err).slice(0, 500)],
          );
        }
      }
      if (out.failed) {
        this.logger.warn(`Photo drain: ${out.deleted} deleted, ${out.failed} failed`);
      }
      return out;
    } finally {
      this.draining = false;
    }
  }

  /**
   * F1 orphan collection: an upload whose `photo_objects` row is still on no
   * record ORPHAN_AFTER_HOURS later was abandoned (form closed, app killed)
   * — queue it as `orphan`. Belt and braces: a path some record, avatar or
   * report still references is never swept, even if its attach was lost.
   * Returns how many were queued; 0 before the migrations.
   */
  async sweepOrphans(limit = 100): Promise<number> {
    let rows: Row[];
    try {
      rows = await this.db.query(
        `SELECT o.namespace, o.path FROM photo_objects o
         WHERE o.record_id IS NULL
           AND o.uploaded_at < now() - interval '${ORPHAN_AFTER_HOURS} hours'
           AND NOT EXISTS (SELECT 1 FROM photo_deletions d WHERE d.namespace = o.namespace AND d.path = o.path)
           AND NOT (o.namespace = 'health' AND (
                 EXISTS (SELECT 1 FROM health_observations h WHERE h.photo_urls @> ARRAY[o.path])
              OR EXISTS (SELECT 1 FROM mortality_records r WHERE r.photo_urls @> ARRAY[o.path])
              OR EXISTS (SELECT 1 FROM disease_records r WHERE r.photo_urls @> ARRAY[o.path])))
           AND NOT (o.namespace = 'avatars' AND EXISTS (SELECT 1 FROM users u WHERE u.avatar_path = o.path))
           AND NOT (o.namespace = 'feedback' AND EXISTS (SELECT 1 FROM feedback_reports f WHERE f.attachment_paths ? o.path))
         ORDER BY o.uploaded_at LIMIT $1`,
        [limit],
      );
    } catch (err) {
      if (isMissingSchema(err)) return 0;
      throw err;
    }
    if (!rows.length) return 0;
    await this.enqueue(rows.map((r) => ({ namespace: r.namespace, path: r.path })), 'orphan');
    return rows.length;
  }

  /**
   * F3 retention: farm photos whose full size has passed its clock
   * (`retentionDropAt`: 12 months after upload, never within 30 days of the
   * owner's notice, never for an owner who has had no notice) get
   * `full_dropped_at` and a `retention_full` queue row — one transaction.
   * The drain then deletes the full-size object only; the thumbnail stays
   * forever and the photo keeps counting at its thumbnail size.
   * Protected photos are included on purpose (§F2.4: retention still applies,
   * the thumbnail is kept). Returns how many were downgraded; 0 before the
   * migrations (42P01/42703 — the safe direction: nothing is dropped).
   */
  async retentionPass(now = new Date(), limit = 500): Promise<number> {
    let rows: { path: string; uploaded_at: Date; notice_at: Date }[];
    try {
      rows = await this.db.query(
        `SELECT o.path, o.uploaded_at, n.notice_at FROM photo_objects o
         JOIN photo_retention_notices n ON n.owner_user_id = o.owner_user_id
         WHERE o.namespace = 'health' AND o.full_dropped_at IS NULL AND o.path LIKE '%.webp'
           AND o.uploaded_at < $1::timestamptz - interval '${FULL_RETENTION_DAYS} days'
           AND n.notice_at < $1::timestamptz - interval '${NOTICE_LEAD_DAYS} days'
           AND ${NOT_PENDING}
         ORDER BY o.uploaded_at LIMIT $2`,
        [now.toISOString(), limit],
      );
    } catch (err) {
      if (isMissingSchema(err)) return 0;
      throw err;
    }
    // The SQL narrows; this is the rule (the same one the notice uses).
    const due = rows
      .filter((r) => {
        const at = retentionDropAt(r.uploaded_at, r.notice_at);
        return !!at && at.getTime() <= now.getTime();
      })
      .map((r) => r.path);
    if (!due.length) return 0;
    await this.db.transaction(async (m) => {
      await m.query(
        `UPDATE photo_objects SET full_dropped_at = $2
         WHERE namespace = 'health' AND path = ANY($1::text[]) AND full_dropped_at IS NULL`,
        [due, now.toISOString()],
      );
      await this.enqueue(
        due.map((path) => ({ namespace: 'health' as const, path })),
        'retention_full',
        null,
        m,
      );
    });
    this.ledger?.markDropped();
    this.logger.log(`Retention: ${due.length} photo(s) downgraded to thumbnail`);
    return due.length;
  }

  /** Rows automatic retries gave up on — for the staff dashboard. */
  async failures(limit = 100) {
    try {
      return await this.db.query(
        `SELECT id, namespace, path, reason, attempts, last_error, requested_at
         FROM photo_deletions
         WHERE done_at IS NULL AND attempts >= ${MAX_AUTO_ATTEMPTS}
         ORDER BY requested_at LIMIT $1`,
        [limit],
      );
    } catch (err) {
      if (isMissingTable(err)) return [];
      throw err;
    }
  }

  /**
   * F2: the object is gone, so it stops counting. Exact path, or everything
   * under a `<owner>/` prefix. Logged, not thrown: the R2 delete already
   * succeeded, and a still-queued row is excluded from usage anyway.
   */
  private async forgetLedger(r: PhotoRef): Promise<void> {
    try {
      await this.db.query(
        `DELETE FROM photo_objects
         WHERE namespace = $1 AND (path = $2 OR (right($2, 1) = '/' AND starts_with(path, $2)))`,
        [r.namespace, r.path],
      );
    } catch (err: any) {
      if (!isMissingTable(err)) {
        this.logger.warn(`Could not drop ledger row(s) for ${r.namespace}/${r.path}: ${err?.message ?? err}`);
      }
    }
  }

  private deleteRef(r: PhotoRef): Promise<void> {
    if (!validRef(r)) {
      return Promise.reject(new Error(`Malformed path ${r.namespace}/${r.path}`));
    }
    return isPrefix(r.path)
      ? this.storage.deletePrefix(r.namespace, r.path)
      : this.storage.deleteImages(r.namespace, [r.path]);
  }

  private async isMigrated(m: EntityManager): Promise<boolean> {
    if (this.migrated) return true;
    const [row] = await m.query(
      `SELECT to_regclass('photo_deletions') IS NOT NULL AS ok`,
    );
    this.migrated = !!row?.ok;
    return this.migrated;
  }
}
