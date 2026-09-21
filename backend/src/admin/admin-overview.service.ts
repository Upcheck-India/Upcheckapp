import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isMissingSchema } from '../health-observations/health.constants';
import { R2AnalyticsService } from '../storage/r2-analytics.service';

export interface AdminOverview {
  signups: { today: number; last7d: number; last30d: number; total: number } | null;
  farms: { total: number; active: number } | null;
  ponds: { total: number; active: number } | null;
  cycles: { active: number } | null;
  logsPerDay: { date: string; count: number }[];
  feedback: { open: number } | null;
  photoDeletions: { failed: number; pending: number } | null;
  /** Only present once F2's photo_objects table exists. */
  storage: { objectCount: number; totalBytes: number } | null;
  /**
   * Admin photo-quota management (item 3): the real R2 bucket, from
   * Cloudflare's GraphQL analytics — null whenever CLOUDFLARE_ANALYTICS_TOKEN
   * / CLOUDFLARE_ACCOUNT_ID are unset or the API call fails. Each photo is 2
   * R2 objects (full + thumb), so this is roughly 2x `storage.objectCount`.
   */
  r2Bucket: { objectCount: number; totalBytes: number } | null;
}

/**
 * GET /admin/overview — one aggregate-only read for the dashboard home page.
 *
 * Every number is its own try/catch: a table that isn't migrated yet (or,
 * for `storage`, doesn't exist yet because F2 hasn't landed) makes that ONE
 * number null/empty rather than 500ing the whole page — same rule as
 * `isMissingTable()` elsewhere (AGENTS.md). No per-user data is read here,
 * only counts.
 */
@Injectable()
export class AdminOverviewService {
  private readonly logger = new Logger(AdminOverviewService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly r2Analytics: R2AnalyticsService,
  ) {}

  async get(): Promise<AdminOverview> {
    const [signups, farms, ponds, cycles, feedback, photoDeletions, logsPerDay, storage, r2Bucket] =
      await Promise.all([
        this.signups(),
        this.farms(),
        this.ponds(),
        this.cycles(),
        this.feedback(),
        this.photoDeletions(),
        this.logsPerDay(),
        this.storage(),
        this.r2Analytics.bucketStats(),
      ]);
    return { signups, farms, ponds, cycles, feedback, photoDeletions, logsPerDay, storage, r2Bucket };
  }

  private async signups(): Promise<AdminOverview['signups']> {
    try {
      const [row] = await this.dataSource.query(
        `SELECT
           count(*) FILTER (WHERE created_at >= now() - interval '1 day') AS today,
           count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS last7d,
           count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS last30d,
           count(*) AS total
         FROM users`,
      );
      return {
        today: Number(row.today),
        last7d: Number(row.last7d),
        last30d: Number(row.last30d),
        total: Number(row.total),
      };
    } catch (err) {
      return this.omit(err, 'signups');
    }
  }

  private async farms(): Promise<AdminOverview['farms']> {
    try {
      const [row] = await this.dataSource.query(
        `SELECT
           (SELECT count(*) FROM farms WHERE deleted_at IS NULL) AS total,
           (SELECT count(DISTINCT farm_id) FROM ponds WHERE status = 'active') AS active`,
      );
      return { total: Number(row.total), active: Number(row.active) };
    } catch (err) {
      return this.omit(err, 'farms');
    }
  }

  private async ponds(): Promise<AdminOverview['ponds']> {
    try {
      const [row] = await this.dataSource.query(
        `SELECT count(*) AS total, count(*) FILTER (WHERE status = 'active') AS active FROM ponds`,
      );
      return { total: Number(row.total), active: Number(row.active) };
    } catch (err) {
      return this.omit(err, 'ponds');
    }
  }

  private async cycles(): Promise<AdminOverview['cycles']> {
    try {
      const [row] = await this.dataSource.query(
        `SELECT count(*) AS active FROM crops WHERE status = 'active'`,
      );
      return { active: Number(row.active) };
    } catch (err) {
      return this.omit(err, 'cycles');
    }
  }

  private async feedback(): Promise<AdminOverview['feedback']> {
    try {
      const [row] = await this.dataSource.query(
        `SELECT count(*) AS open FROM feedback_reports WHERE status IN ('new', 'seen', 'in_review')`,
      );
      return { open: Number(row.open) };
    } catch (err) {
      return this.omit(err, 'feedback');
    }
  }

  private async photoDeletions(): Promise<AdminOverview['photoDeletions']> {
    try {
      const [row] = await this.dataSource.query(
        `SELECT
           count(*) FILTER (WHERE done_at IS NULL) AS pending,
           count(*) FILTER (WHERE done_at IS NULL AND attempts >= 5) AS failed
         FROM photo_deletions`,
      );
      return { pending: Number(row.pending), failed: Number(row.failed) };
    } catch (err) {
      return this.omit(err, 'photoDeletions');
    }
  }

  /**
   * Last 14 IST calendar days, including days with zero logs. `AT TIME ZONE
   * 'Asia/Kolkata'` (same day boundary as `toIstDateString()` in
   * common/ist-date.ts, done in SQL here since this is an aggregate query) —
   * a plain UTC bucket would misfile anything logged before 05:30 IST onto
   * the previous day.
   */
  private async logsPerDay(): Promise<{ date: string; count: number }[]> {
    try {
      const rows = await this.dataSource.query(
        `SELECT to_char(d, 'YYYY-MM-DD') AS date, count(m.id)::int AS count
         FROM generate_series(
                date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') - interval '13 days',
                date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata'),
                interval '1 day'
              ) d
         LEFT JOIN measurements m
           ON date_trunc('day', m.created_at AT TIME ZONE 'Asia/Kolkata') = d
         GROUP BY d ORDER BY d`,
      );
      return rows.map((r: any) => ({ date: r.date, count: Number(r.count) }));
    } catch (err) {
      if (isMissingSchema(err)) {
        this.logger.warn('measurements is missing — logsPerDay omitted.');
        return [];
      }
      throw err;
    }
  }

  /**
   * Only meaningful once F2's photo_objects table lands. Column names and the
   * total-bytes formula per the F2 spec: `bytes_thumb` is always kept, but
   * `bytes_full` is reclaimed once the full-size copy is dropped
   * (`full_dropped_at` set) — so a dropped row's full-size bytes don't count
   * toward the total, only its thumbnail's do.
   */
  private async storage(): Promise<AdminOverview['storage']> {
    try {
      const [{ exists }] = await this.dataSource.query(
        `SELECT to_regclass('photo_objects') IS NOT NULL AS exists`,
      );
      if (!exists) return null;
      const [row] = await this.dataSource.query(
        `SELECT
           count(*) AS count,
           coalesce(sum(bytes_thumb), 0)
             + coalesce(sum(bytes_full) FILTER (WHERE full_dropped_at IS NULL), 0) AS bytes
         FROM photo_objects`,
      );
      return { objectCount: Number(row.count), totalBytes: Number(row.bytes) };
    } catch (err) {
      // 42703 covers photo_objects existing with different column names than
      // expected — degrade the same as "table doesn't exist yet".
      if (isMissingSchema(err)) return null;
      throw err;
    }
  }

  private omit(err: any, field: string): null {
    if (isMissingSchema(err)) {
      this.logger.warn(`${field} table/column is missing — omitted from overview.`);
      return null;
    }
    throw err;
  }
}
