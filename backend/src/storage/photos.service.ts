import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { R2StorageService } from './r2-storage.service';
import { PhotoDeletionService, type PhotoDeletionReason } from './photo-deletion.service';
import { LIVE_BYTES, NOT_PENDING, PHOTO_QUOTA, PhotoLedgerService } from './photo-ledger.service';
import { removedPhotoTombstone } from '../health-observations/photo-removal.util';

const isMissingSchema = (err: any) =>
  ['42P01', '42703'].includes(err?.code ?? err?.driverError?.code);

/**
 * §F2.4 protected photos, for the rules whose data exists today:
 * - attached to a disease record carrying a banned/restricted substance flag (D3).
 * The column `protected` is the hook for the rest (set it, it sticks).
 * Skipped until their data exists (no invented schema):
 * - seed PCR certificate — crops store the PCR result, no certificate photo;
 * - cycle input record already generated — D4 builds it on demand, no persisted marker;
 * - harvest weighing slip within 12 months — harvests have no photos yet (F5).
 */
export const PROTECTED = `(o.protected OR (o.entity = 'disease' AND EXISTS (
  SELECT 1 FROM disease_records dr
  WHERE dr.id = o.record_id AND dr.banned_substance_flag IN ('banned', 'restricted'))))`;

/**
 * The caller's own pool, and only while they still own the farm: a farm that
 * changed hands is managed by its new owner.
 */
const MINE = `o.owner_user_id = $1 AND (o.farm_id IS NULL OR EXISTS (
  SELECT 1 FROM farms fo WHERE fo.id = o.farm_id AND fo.user_id = $1))`;

/** Record tables that hold health photo paths, and their free-text field. */
const RECORD_TABLES: { table: string; note: string | null }[] = [
  { table: 'mortality_records', note: 'note' },
  { table: 'disease_records', note: 'notes' },
  // No free-text column: the path is dropped without a tombstone line.
  { table: 'health_observations', note: null },
];

const num = (v: unknown) => Number(v ?? 0);

export interface PondUsage { pondId: string | null; name: string | null; photos: number; bytes: number }
export interface FarmUsage { farmId: string; name: string | null; photos: number; bytes: number; ponds: PondUsage[] }

/** F2: the storage screen — usage, per-record lists, and clearing space. */
@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    private readonly db: DataSource,
    private readonly storage: R2StorageService,
    private readonly ledger: PhotoLedgerService,
    private readonly deletions: PhotoDeletionService,
  ) {}

  /**
   * Totals (= the sum of the ledger) and the farm → pond breakdown. Each read
   * also kicks the F1 lazy drain + orphan sweep. `incomplete` until the
   * backfill has put pre-F2 photos in the ledger.
   */
  async usage(userId: string) {
    this.deletions.drainSoon();
    let rows: any[] = [];
    try {
      rows = await this.db.query(
        `SELECT o.farm_id, f.name AS farm_name, o.pond_id, p.name AS pond_name,
                count(*)::int AS photos, sum(${LIVE_BYTES})::bigint AS bytes
         FROM photo_objects o
         LEFT JOIN farms f ON f.id = o.farm_id
         LEFT JOIN ponds p ON p.id = o.pond_id
         WHERE ${MINE} AND ${NOT_PENDING}
         GROUP BY o.farm_id, f.name, o.pond_id, p.name
         ORDER BY f.name, p.name`,
        [userId],
      );
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
      return { photos: 0, bytes: 0, limits: PHOTO_QUOTA, incomplete: true, farms: [], account: { photos: 0, bytes: 0 } };
    }

    const farms = new Map<string, FarmUsage>();
    const account = { photos: 0, bytes: 0 };
    for (const r of rows) {
      const photos = num(r.photos);
      const bytes = num(r.bytes);
      if (!r.farm_id) {
        account.photos += photos;
        account.bytes += bytes;
        continue;
      }
      const farm: FarmUsage = farms.get(r.farm_id) ?? { farmId: r.farm_id, name: r.farm_name, photos: 0, bytes: 0, ponds: [] };
      farm.photos += photos;
      farm.bytes += bytes;
      farm.ponds.push({ pondId: r.pond_id, name: r.pond_name, photos, bytes });
      farms.set(r.farm_id, farm);
    }
    const all = [...farms.values()];
    return {
      photos: all.reduce((s, f) => s + f.photos, account.photos),
      bytes: all.reduce((s, f) => s + f.bytes, account.bytes),
      limits: PHOTO_QUOTA,
      incomplete: await this.incomplete(userId),
      farms: all,
      account,
    };
  }

  /** The pool a pond's uploads count against (its farm owner's), for the picker. */
  async quotaForPond(pondId: string) {
    const [row] = await this.db.query(
      `SELECT f.user_id FROM ponds p JOIN farms f ON f.id = p.farm_id WHERE p.id = $1`,
      [pondId],
    );
    const used = row ? await this.ledger.usageOf(row.user_id) : null;
    return { photos: used?.photos ?? 0, bytes: used?.bytes ?? 0, limits: PHOTO_QUOTA };
  }

  /**
   * One pond's photos (or a farm's farm-level ones), newest first, with the
   * record each belongs to and a signed thumbnail. Only the caller's pool.
   * ponytail: capped at 500 rows, no paging — the per-account limit is 1,000.
   */
  async list(userId: string, scope: { pondId?: string; farmId?: string }) {
    const where = scope.pondId ? `o.pond_id = $2` : `o.farm_id = $2 AND o.pond_id IS NULL`;
    let rows: any[];
    try {
      rows = await this.db.query(
        `SELECT o.path, o.entity, o.record_id, o.uploaded_at, ${LIVE_BYTES}::bigint AS bytes,
                ${PROTECTED} AS protected
         FROM photo_objects o
         WHERE ${MINE} AND ${NOT_PENDING} AND o.namespace = 'health' AND ${where}
         ORDER BY o.uploaded_at DESC LIMIT 500`,
        [userId, scope.pondId ?? scope.farmId],
      );
    } catch (err) {
      if (isMissingSchema(err)) return [];
      throw err;
    }
    const { full, thumb } = await this.storage.sign('health', rows.map((r) => r.path));
    return rows.map((r, i) => ({
      path: r.path,
      entity: r.entity ?? null,
      recordId: r.record_id ?? null,
      uploadedAt: r.uploaded_at,
      bytes: num(r.bytes),
      protected: !!r.protected,
      url: full[i] ?? null,
      thumbUrl: thumb[i] ?? null,
    }));
  }

  /**
   * "Free up space": closed cycles first, then ponds — what each would free,
   * shown before anything is deleted. Protected photos are never part of it
   * (counted separately so the screen can say they stay).
   * ponytail: "older than 12 months" joins the list with F3 (thumbnails kept).
   */
  async freeUpOptions(userId: string) {
    const agg = `count(*) FILTER (WHERE NOT ${PROTECTED})::int AS photos,
                 COALESCE(sum(${LIVE_BYTES}) FILTER (WHERE NOT ${PROTECTED}), 0)::bigint AS bytes,
                 count(*) FILTER (WHERE ${PROTECTED})::int AS protected`;
    try {
      const cycles = await this.db.query(
        `SELECT c.id, c.name, p.name AS pond_name, f.name AS farm_name, ${agg}
         FROM photo_objects o
         JOIN crops c ON c.id = o.crop_id JOIN ponds p ON p.id = c.pond_id JOIN farms f ON f.id = p.farm_id
         WHERE ${MINE} AND ${NOT_PENDING} AND o.namespace = 'health' AND c.status IN ('completed', 'cancelled')
         GROUP BY c.id, c.name, p.name, f.name ORDER BY f.name, p.name, c.name`,
        [userId],
      );
      const ponds = await this.db.query(
        `SELECT p.id, p.name, NULL AS pond_name, f.name AS farm_name, ${agg}
         FROM photo_objects o JOIN ponds p ON p.id = o.pond_id JOIN farms f ON f.id = p.farm_id
         WHERE ${MINE} AND ${NOT_PENDING} AND o.namespace = 'health'
         GROUP BY p.id, p.name, f.name ORDER BY f.name, p.name`,
        [userId],
      );
      const shape = (kind: 'crop' | 'pond') => (r: any) => ({
        kind,
        id: r.id,
        name: r.name,
        pondName: r.pond_name,
        farmName: r.farm_name,
        photos: num(r.photos),
        bytes: num(r.bytes),
        protected: num(r.protected),
      });
      return [...cycles.map(shape('crop')), ...ponds.map(shape('pond'))].filter(
        (o) => o.photos > 0 || o.protected > 0,
      );
    } catch (err) {
      if (isMissingSchema(err)) return [];
      throw err;
    }
  }

  /** Clear one cycle's or pond's unprotected photos (F1 queue, tombstones). */
  async freeUp(userId: string, kind: 'crop' | 'pond', id: string) {
    const col = kind === 'crop' ? 'o.crop_id' : 'o.pond_id';
    const rows: { path: string; bytes: string }[] = await this.db.query(
      `SELECT o.path, ${LIVE_BYTES}::bigint AS bytes FROM photo_objects o
       WHERE ${MINE} AND ${NOT_PENDING} AND o.namespace = 'health' AND ${col} = $2 AND NOT ${PROTECTED}`,
      [userId, id],
    );
    const paths = rows.map((r) => r.path);
    await this.remove(paths, 'user_cleared', userId);
    return { photos: paths.length, bytes: rows.reduce((s, r) => s + num(r.bytes), 0) };
  }

  /**
   * One photo, from its row on the storage screen. Protected photos CAN be
   * deleted this way (nothing is undeletable; the app asks a distinct
   * confirm first); the record keeps its tombstone line either way.
   */
  async removeOne(userId: string, path: string) {
    const [row] = await this.db.query(
      `SELECT o.path, ${PROTECTED} AS protected FROM photo_objects o
       WHERE ${MINE} AND ${NOT_PENDING} AND o.namespace = 'health' AND o.path = $2`,
      [userId, path],
    );
    if (!row) throw new NotFoundException('Photo not found');
    await this.remove([path], 'photo_removed', userId);
    return { removed: true, protected: !!row.protected };
  }

  /** Drop the paths from every record, leave the tombstone, queue the objects — one transaction. */
  private async remove(paths: string[], reason: PhotoDeletionReason, userId: string) {
    if (!paths.length) return;
    await this.db.transaction(async (m) => {
      await this.detach(m, paths, userId);
      await this.deletions.enqueue(
        paths.map((path) => ({ namespace: 'health' as const, path })),
        reason,
        userId,
        m,
      );
    });
  }

  private async detach(m: EntityManager, paths: string[], userId: string) {
    const gone = new Set(paths);
    for (const { table, note } of RECORD_TABLES) {
      const rows: { id: string; photo_urls: string[]; note?: string | null }[] = await m.query(
        `SELECT id, photo_urls${note ? `, ${note} AS note` : ''} FROM ${table} WHERE photo_urls && $1::text[]`,
        [paths],
      );
      for (const r of rows) {
        const kept = (r.photo_urls ?? []).filter((p) => !gone.has(p));
        if (!note) {
          await m.query(`UPDATE ${table} SET photo_urls = $2 WHERE id = $1`, [r.id, kept]);
          continue;
        }
        const { tombstone } = await removedPhotoTombstone(m, r.photo_urls, kept, userId);
        await m.query(
          `UPDATE ${table} SET photo_urls = $2, ${note} = $3, updated_by_id = $4 WHERE id = $1`,
          [r.id, kept, [r.note, tombstone].filter(Boolean).join('\n'), userId],
        );
      }
    }
  }

  /**
   * Pre-F2 photos are in the records but not the ledger until the backfill
   * script runs — say so rather than show a number that reads low (§5).
   */
  private async incomplete(userId: string): Promise<boolean> {
    try {
      const [row] = await this.db.query(
        `SELECT EXISTS (
           SELECT 1 FROM (
             SELECT unnest(h.photo_urls) AS p FROM health_observations h
               JOIN ponds po ON po.id = h.pond_id JOIN farms f ON f.id = po.farm_id WHERE f.user_id = $1
             UNION ALL SELECT unnest(r.photo_urls) FROM mortality_records r
               JOIN crops c ON c.id = r.crop_id JOIN ponds po ON po.id = c.pond_id JOIN farms f ON f.id = po.farm_id WHERE f.user_id = $1
             UNION ALL SELECT unnest(r.photo_urls) FROM disease_records r
               JOIN crops c ON c.id = r.crop_id JOIN ponds po ON po.id = c.pond_id JOIN farms f ON f.id = po.farm_id WHERE f.user_id = $1
             UNION ALL SELECT avatar_path FROM users WHERE id = $1 AND avatar_path IS NOT NULL
           ) x WHERE NOT EXISTS (SELECT 1 FROM photo_objects o WHERE o.path = x.p)
         ) AS incomplete`,
        [userId],
      );
      return !!row?.incomplete;
    } catch (err: any) {
      this.logger.warn(`Could not check ledger completeness: ${err?.message ?? err}`);
      return false;
    }
  }
}
