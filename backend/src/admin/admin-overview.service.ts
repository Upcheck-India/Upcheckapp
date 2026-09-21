import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isMissingSchema } from '../health-observations/health.constants';

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

  constructor(private readonly dataSource: DataSource) {}

  async get(): Promise<AdminOverview> {
    const [signups, farms, ponds, cycles, feedback, photoDeletions, logsPerDay, storage] =
      await Promise.all([
        this.signups(),
        this.farms(),
        this.ponds(),
        this.cycles(),
        this.feedback(),
        this.photoDeletions(),
        this.logsPerDay(),
        this.storage(),
      ]);
    return { signups, farms, ponds, cycles, feedback, photoDeletions, logsPerDay, storage };
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

  /** Last 14 (UTC) calendar days, including days with zero logs. */
  private async logsPerDay(): Promise<{ date: string; count: number }[]> {
    try {
      const rows = await this.dataSource.query(
        `SELECT to_char(d::date, 'YYYY-MM-DD') AS date, count(m.id)::int AS count
         FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') d
         LEFT JOIN measurements m ON date_trunc('day', m.created_at) = d
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

  /** Only meaningful once F2's photo_objects table lands. */
  private async storage(): Promise<AdminOverview['storage']> {
    try {
      const [{ exists }] = await this.dataSource.query(
        `SELECT to_regclass('photo_objects') IS NOT NULL AS exists`,
      );
      if (!exists) return null;
      const [row] = await this.dataSource.query(
        `SELECT count(*) AS count, coalesce(sum(size_bytes), 0) AS bytes FROM photo_objects`,
      );
      return { objectCount: Number(row.count), totalBytes: Number(row.bytes) };
    } catch (err) {
      // 42703 covers photo_objects existing with a different size column name
      // than we guessed — degrade the same as "table doesn't exist yet".
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
