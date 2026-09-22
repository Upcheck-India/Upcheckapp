import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { R2StorageService } from './r2-storage.service';
import { PhotoDeletionService, type PhotoDeletionReason } from './photo-deletion.service';
import { COUNTED, LIVE_BYTES, NOT_PENDING, PHOTO_QUOTA, PhotoLedgerService } from './photo-ledger.service';
import { removedPhotoTombstone } from '../health-observations/photo-removal.util';
import { MONEY_ENTITIES } from './photo-surfaces';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { FULL_RETENTION_DAYS, NOTICE_LEAD_DAYS, retentionDropAt } from './retention';

/**
 * Ledger `entity` values whose photos are financial data (PD6): returned only
 * to roles with VIEW_FINANCIALS on that farm. Filtered by entity, so a money
 * surface added later is covered the day its uploads carry one of these.
 */
export const MONEY_PHOTO_ENTITIES = ['expense', 'transaction', 'harvest', 'purchase', 'inventory_purchase'];

/** A backup batch the app zips: one record, one pond-month, or one cycle. */
export type BackupScope = { recordId: string } | { pondId: string; month: string } | { cropId: string };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const isMissingSchema = (err: any) =>
  ['42P01', '42703'].includes(err?.code ?? err?.driverError?.code);

/**
 * §F2.4 protected photos:
 * - attached to a disease record carrying a banned/restricted substance flag (D3);
 * - a seed PCR certificate (D5) — protected unconditionally, F5 gave this real data;
 * - a harvest's buyer's weighing slip, within 12 months of the harvest (F5);
 * - the column `protected` is the hook for the rest (set it, it sticks) —
 *   still skipped: "cycle input record already generated" (D4 builds it on
 *   demand, no persisted marker).
 */
export const PROTECTED = `(o.protected
  OR (o.entity = 'disease' AND EXISTS (
    SELECT 1 FROM disease_records dr
    WHERE dr.id = o.record_id AND dr.banned_substance_flag IN ('banned', 'restricted')))
  OR o.entity = 'crop'
  OR (o.entity = 'harvest' AND EXISTS (
    SELECT 1 FROM harvests h
    WHERE h.id = o.record_id AND h.harvest_date > (now() - interval '12 months'))))`;

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

/**
 * F6: what a photo "belongs to", by `photo_objects.entity`. A static label
 * per entity type, not a per-record join (a per-record detail like a
 * diagnosis name needs a table-specific join for each of 14 entities — this
 * gives the tab its grouping/filtering without the N+1 cost; a later pass
 * can enrich to "Health check — white feces" once the tab proves it's worth it).
 * ponytail: static label, not a per-record title join.
 */
const ENTITY_TITLES: Record<string, string> = {
  health_observation: 'Health check',
  mortality: 'Mortality record',
  disease: 'Disease record',
  expense: 'Expense — receipt',
  transaction: 'Transaction — receipt',
  harvest: 'Harvest — weighing slip',
  treatment: 'Treatment — input label',
  feed_record: 'Feed record — input label',
  inventory: 'Inventory item — input label',
  crop: 'Stocking — seed PCR certificate',
  pond: 'Pond photo',
  farm: 'Farm photo',
  water_quality: 'Water quality — colour',
  feeding_tray_check: 'Feed tray check',
};

const FILTER_ENTITIES: Record<string, Set<string> | null> = {
  all: null,
  health: new Set(['health_observation', 'mortality', 'disease']),
  money: MONEY_ENTITIES,
  inputs: new Set(['treatment', 'feed_record', 'inventory', 'crop']),
  pond: new Set(['pond', 'water_quality', 'feeding_tray_check', 'farm']),
};
/** Past its 12 months of full size (alias `o`). */
const OLD = `o.uploaded_at < now() - interval '${FULL_RETENTION_DAYS} days'`;

export type FreeUpKind = 'old' | 'crop' | 'pond';

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
    private readonly access: FarmAccessService,
  ) {}

  // ─────────────────────────── F4: backup ───────────────────────────

  /**
   * Everything the app needs to zip one record, one pond-month or one cycle:
   * batch-signed download URLs (the thumbnail's, once retention dropped the
   * full size — `sign()` does that) plus what goes in `photos.csv`.
   * READ on the pond is enough (any member may save what they can see);
   * money photos only with VIEW_FINANCIALS on their farm.
   * ponytail: capped at 2,000 rows — four times the default per-account photo limit.
   */
  async backup(userId: string, scope: BackupScope) {
    let where: string;
    let params: unknown[];
    if ('recordId' in scope) {
      const ponds: { pond_id: string | null; farm_id: string | null }[] = await this.query(
        `SELECT DISTINCT pond_id, farm_id FROM photo_objects WHERE namespace = 'health' AND record_id = $1`,
        [scope.recordId],
      );
      for (const p of ponds) {
        if (p.pond_id) await this.access.assertCanAccessPond(userId, p.pond_id, 'READ');
        else if (p.farm_id) await this.access.assertCanAccessFarm(userId, p.farm_id, 'READ');
        else throw new NotFoundException('Photos not found');
      }
      where = `o.record_id = $1`;
      params = [scope.recordId];
    } else if ('cropId' in scope) {
      const [crop] = await this.db.query(`SELECT pond_id FROM crops WHERE id = $1`, [scope.cropId]);
      if (!crop) throw new NotFoundException('Cycle not found');
      await this.access.assertCanAccessPond(userId, crop.pond_id, 'READ');
      where = `o.crop_id = $1`;
      params = [scope.cropId];
    } else {
      if (!MONTH_RE.test(scope.month)) throw new BadRequestException('month must be YYYY-MM');
      await this.access.assertCanAccessPond(userId, scope.pondId, 'READ');
      where = `o.pond_id = $1 AND o.uploaded_at >= $2::date AND o.uploaded_at < $2::date + interval '1 month'`;
      params = [scope.pondId, `${scope.month}-01`];
    }

    let rows: any[] = await this.query(
      `SELECT o.path, o.entity, o.record_id, o.farm_id, o.uploaded_at, o.full_dropped_at,
              (CASE WHEN o.full_dropped_at IS NULL THEN o.bytes_full ELSE o.bytes_thumb END)::bigint AS bytes,
              f.name AS farm_name, p.name AS pond_name, c.name AS crop_name
       FROM photo_objects o
       LEFT JOIN farms f ON f.id = o.farm_id
       LEFT JOIN ponds p ON p.id = o.pond_id
       LEFT JOIN crops c ON c.id = o.crop_id
       WHERE o.namespace = 'health' AND ${NOT_PENDING} AND ${where}
       ORDER BY o.uploaded_at LIMIT 2000`,
      params,
    );
    rows = await this.withoutMoneyPhotos(userId, rows);
    const { full } = await this.storage.sign('health', rows.map((r) => r.path));
    return rows.map((r, i) => ({
      path: r.path,
      url: full[i] ?? null,
      entity: r.entity ?? null,
      recordId: r.record_id ?? null,
      uploadedAt: r.uploaded_at,
      fullDroppedAt: r.full_dropped_at ?? null,
      bytes: num(r.bytes),
      farmName: r.farm_name ?? null,
      pondName: r.pond_name ?? null,
      cropName: r.crop_name ?? null,
    }));
  }

  /** Cycles on the caller's farms that have photos — the storage screen's "Back up" list. */
  async backupCycles(userId: string) {
    const rows: any[] = await this.query(
      `SELECT c.id, c.name, p.name AS pond_name, f.name AS farm_name,
              count(*)::int AS photos,
              sum(CASE WHEN o.full_dropped_at IS NULL THEN o.bytes_full ELSE o.bytes_thumb END)::bigint AS bytes
       FROM photo_objects o
       JOIN crops c ON c.id = o.crop_id JOIN ponds p ON p.id = c.pond_id JOIN farms f ON f.id = p.farm_id
       WHERE ${MINE} AND ${NOT_PENDING} AND o.namespace = 'health'
       GROUP BY c.id, c.name, p.name, f.name ORDER BY f.name, p.name, c.name`,
      [userId],
    );
    return rows.map((r) => ({
      cropId: r.id,
      name: r.name,
      pondName: r.pond_name,
      farmName: r.farm_name,
      photos: num(r.photos),
      bytes: num(r.bytes),
    }));
  }

  /**
   * What the viewer needs about the farm photos on screen: whether the
   * caller uploaded each one (F7.8 "Report this photo" is only for others'
   * photos), whether it is a small copy (F3 caption), and its record (F4
   * "Save these photos"). Only photos on farms the caller belongs to.
   */
  async info(userId: string, paths: string[]) {
    if (!paths.length) return [];
    let rows: any[] = await this.query(
      `SELECT path, entity, record_id, farm_id, uploaded_at, uploaded_by, full_dropped_at
       FROM photo_objects WHERE namespace = 'health' AND path = ANY($1::text[])`,
      [paths],
    );
    const farms = new Set(await this.access.getAccessibleFarmIds(userId, true));
    rows = await this.withoutMoneyPhotos(userId, rows.filter((r) => farms.has(r.farm_id)));
    return rows.map((r) => ({
      path: r.path,
      entity: r.entity ?? null,
      recordId: r.record_id ?? null,
      uploadedAt: r.uploaded_at,
      uploadedByMe: r.uploaded_by === userId,
      fullDroppedAt: r.full_dropped_at ?? null,
    }));
  }

  private async withoutMoneyPhotos<T extends { entity?: string | null; farm_id?: string | null }>(
    userId: string,
    rows: T[],
  ): Promise<T[]> {
    if (!rows.some((r) => MONEY_PHOTO_ENTITIES.includes(r.entity ?? ''))) return rows;
    const money = new Set(await this.access.getFarmIdsWithCapability(userId, 'VIEW_FINANCIALS'));
    return rows.filter((r) => !MONEY_PHOTO_ENTITIES.includes(r.entity ?? '') || money.has(r.farm_id ?? ''));
  }

  // ─────────────────────────── F3: retention ───────────────────────────

  /**
   * The honest part of retention, for the caller's own pool:
   * - `oldestFullAt`: the oldest farm photo still at full size (the permanent
   *   line on the storage screen);
   * - `upcoming`: the next batch that shrinks, and the date — the in-app
   *   notice. The first time a batch is within 30 days of its 12 months,
   *   this read STAMPS the account's notice clock, and nothing of theirs is
   *   downgraded until 30 days after that (retentionDropAt).
   */
  async retention(userId: string, now = new Date()) {
    const base = `FROM photo_objects o WHERE ${MINE} AND ${NOT_PENDING}
      AND o.namespace = 'health' AND o.full_dropped_at IS NULL AND o.path LIKE '%.webp'`;
    const [oldest] = await this.query(`SELECT min(o.uploaded_at) AS at ${base}`, [userId]);
    const out = { oldestFullAt: oldest?.at ?? null, upcoming: null as null | { photos: number; since: string; date: string } };
    if (!oldest?.at) return out;

    const soon = new Date(now.getTime() - (FULL_RETENTION_DAYS - NOTICE_LEAD_DAYS) * 86_400_000);
    if (new Date(oldest.at) > soon) return out;

    let noticeAt: Date;
    try {
      await this.db.query(
        `INSERT INTO photo_retention_notices (owner_user_id, notice_at) VALUES ($1, $2) ON CONFLICT (owner_user_id) DO NOTHING`,
        [userId, now.toISOString()],
      );
      const [n] = await this.db.query(`SELECT notice_at FROM photo_retention_notices WHERE owner_user_id = $1`, [userId]);
      noticeAt = n.notice_at;
    } catch (err) {
      // Not migrated: retention is off, so there is nothing to warn about.
      if (isMissingSchema(err)) return out;
      throw err;
    }
    const date = retentionDropAt(oldest.at, noticeAt)!;
    const cutoff = new Date(date.getTime() - FULL_RETENTION_DAYS * 86_400_000);
    const [c] = await this.query(`SELECT count(*)::int AS n ${base} AND o.uploaded_at <= $2`, [userId, cutoff.toISOString()]);
    out.upcoming = { photos: num(c?.n), since: new Date(oldest.at).toISOString(), date: date.toISOString() };
    return out;
  }

  /** db.query, with a not-migrated ledger read as "no rows". */
  private async query(sql: string, params: unknown[]): Promise<any[]> {
    try {
      return await this.db.query(sql, params);
    } catch (err) {
      if (isMissingSchema(err)) return [];
      throw err;
    }
  }

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
         WHERE ${MINE} AND ${COUNTED} AND ${NOT_PENDING}
         GROUP BY o.farm_id, f.name, o.pond_id, p.name
         ORDER BY f.name, p.name`,
        [userId],
      );
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
      return { photos: 0, bytes: 0, limits: await this.limits(userId), incomplete: true, farms: [], account: { photos: 0, bytes: 0 } };
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
      limits: await this.limits(userId),
      incomplete: await this.incomplete(userId),
      farms: all,
      account,
    };
  }

  /**
   * Admin "Top storage users" (item 1): the `limit` accounts using the most
   * bytes, with their email and % of their own limit (override if they have
   * one). No photo content, no paths — just the numbers, joined against
   * `users` (scoped select) and `photo_quota_overrides` for the limit.
   */
  async topUsers(limit = 50) {
    let rows: any[];
    try {
      rows = await this.db.query(
        `SELECT o.owner_user_id, u.email,
                count(*)::int AS photos, sum(${LIVE_BYTES})::bigint AS bytes,
                ov.max_photos, ov.max_bytes
         FROM photo_objects o
         JOIN users u ON u.id = o.owner_user_id
         LEFT JOIN photo_quota_overrides ov ON ov.user_id = o.owner_user_id
         WHERE ${COUNTED} AND ${NOT_PENDING}
         GROUP BY o.owner_user_id, u.email, ov.max_photos, ov.max_bytes
         ORDER BY bytes DESC
         LIMIT $1`,
        [limit],
      );
    } catch (err) {
      if (isMissingSchema(err)) return [];
      throw err;
    }
    return rows.map((r) => {
      const maxBytes = r.max_bytes !== null && r.max_bytes !== undefined ? Number(r.max_bytes) : PHOTO_QUOTA.bytes;
      const maxPhotos = r.max_photos !== null && r.max_photos !== undefined ? Number(r.max_photos) : PHOTO_QUOTA.photos;
      const bytes = num(r.bytes);
      return {
        userId: r.owner_user_id,
        email: r.email,
        photos: num(r.photos),
        bytes,
        limits: { photos: maxPhotos, bytes: maxBytes },
        // Whichever limit is closer — both are enforced.
        percentOfLimit:
          Math.round(Math.max(maxPhotos > 0 ? num(r.photos) / maxPhotos : 0, maxBytes > 0 ? bytes / maxBytes : 0) * 1000) / 10,
        overridden: r.max_bytes !== null && r.max_bytes !== undefined,
      };
    });
  }

  /** The pool a pond's uploads count against (its farm owner's), for the picker. */
  async quotaForPond(pondId: string) {
    const [row] = await this.db.query(
      `SELECT f.user_id FROM ponds p JOIN farms f ON f.id = p.farm_id WHERE p.id = $1`,
      [pondId],
    );
    if (!row) return { photos: 0, bytes: 0, limits: await this.limits(null) };
    const used = await this.ledger.usageOf(row.user_id);
    return { photos: used?.photos ?? 0, bytes: used?.bytes ?? 0, limits: await this.limits(row.user_id) };
  }

  /** The API shape of the account limit — always via `ledger.quotaFor`. */
  private async limits(ownerUserId: string | null) {
    const q = await this.ledger.quotaFor(ownerUserId ?? '');
    return { photos: q.maxPhotos, bytes: q.maxBytes };
  }

  /**
   * One pond's photos (or a farm's farm-level ones), newest first, with the
   * record each belongs to and a signed thumbnail. Only the caller's pool.
   * ponytail: capped at 500 rows, no paging — the default per-account limit is 500.
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
   * F6: the pond Photos tab — a VIEW over records, never an album (§2). Every
   * row names the record it belongs to (a static per-entity label, see
   * ENTITY_TITLES) and carries the record's id so the app can open it.
   * `canViewFinancials` strips money rows entirely rather than masking one
   * field, because the row's only content IS the money photo (§F5/§F6).
   * READ capability on the pond is checked by the controller before this runs.
   */
  async feedForPond(
    pondId: string,
    opts: { canViewFinancials: boolean; category?: string; before?: string; limit?: number },
  ) {
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const params: any[] = [pondId];
    let where = `o.pond_id = $1 AND ${NOT_PENDING} AND o.namespace = 'health'`;
    if (opts.before) {
      params.push(opts.before);
      where += ` AND o.uploaded_at < $${params.length}`;
    }
    let rows: any[];
    try {
      rows = await this.db.query(
        `SELECT o.path, o.entity, o.record_id, o.crop_id, o.farm_id, o.uploaded_at, ${PROTECTED} AS protected
         FROM photo_objects o WHERE ${where}
         ORDER BY o.uploaded_at DESC LIMIT ${limit}`,
        params,
      );
    } catch (err) {
      if (isMissingSchema(err)) return [];
      throw err;
    }

    rows = rows.filter((r) => opts.canViewFinancials || !MONEY_ENTITIES.has(r.entity));
    const wanted = FILTER_ENTITIES[opts.category ?? 'all'];
    if (wanted) rows = rows.filter((r) => wanted.has(r.entity));

    const { full, thumb } = await this.storage.sign('health', rows.map((r) => r.path));
    return rows.map((r, i) => ({
      path: r.path,
      entity: r.entity ?? null,
      title: ENTITY_TITLES[r.entity] ?? r.entity ?? 'Photo',
      recordId: r.record_id ?? null,
      // For the tap-to-open mapping (F6): most record screens are keyed by
      // crop or farm, not the pond this tab is already scoped to.
      cropId: r.crop_id ?? null,
      farmId: r.farm_id ?? null,
      uploadedAt: r.uploaded_at,
      protected: !!r.protected,
      money: MONEY_ENTITIES.has(r.entity),
      url: full[i] ?? null,
      thumbUrl: thumb[i] ?? null,
    }));
  }

  /**
   * "Free up space", in the spec's order: photos older than 12 months
   * (retention already keeps only their small copy), then closed cycles, then
   * ponds — what each would free, shown before anything is deleted.
   * Protected photos are never part of it (counted separately so the screen
   * can say they stay).
   */
  async freeUpOptions(userId: string) {
    const agg = `count(*) FILTER (WHERE NOT ${PROTECTED})::int AS photos,
                 COALESCE(sum(${LIVE_BYTES}) FILTER (WHERE NOT ${PROTECTED}), 0)::bigint AS bytes,
                 count(*) FILTER (WHERE ${PROTECTED})::int AS protected`;
    try {
      const old = await this.db.query(
        `SELECT 'old' AS id, NULL AS name, NULL AS pond_name, NULL AS farm_name, ${agg}
         FROM photo_objects o
         WHERE ${MINE} AND ${NOT_PENDING} AND o.namespace = 'health' AND ${OLD}`,
        [userId],
      );
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
      const shape = (kind: FreeUpKind) => (r: any) => ({
        kind,
        id: r.id,
        name: r.name,
        pondName: r.pond_name,
        farmName: r.farm_name,
        photos: num(r.photos),
        bytes: num(r.bytes),
        protected: num(r.protected),
      });
      return [...old.map(shape('old')), ...cycles.map(shape('crop')), ...ponds.map(shape('pond'))].filter(
        (o) => o.photos > 0 || o.protected > 0,
      );
    } catch (err) {
      if (isMissingSchema(err)) return [];
      throw err;
    }
  }

  /** Clear the unprotected photos older than 12 months, or of one cycle or pond (F1 queue, tombstones). */
  async freeUp(userId: string, kind: FreeUpKind, id?: string) {
    const scope = kind === 'old' ? OLD : kind === 'crop' ? 'o.crop_id = $2' : 'o.pond_id = $2';
    const rows: { path: string; bytes: string }[] = await this.db.query(
      `SELECT o.path, ${LIVE_BYTES}::bigint AS bytes FROM photo_objects o
       WHERE ${MINE} AND ${NOT_PENDING} AND o.namespace = 'health' AND ${scope} AND NOT ${PROTECTED}`,
      kind === 'old' ? [userId] : [userId, id],
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
