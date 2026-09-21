import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

const isMissingTable = (err: any) => (err?.code ?? err?.driverError?.code) === '42P01';

/** C6: prune rows older than this on every read, rather than a cron nothing runs. */
const RETENTION_MONTHS = 12;

export interface AccessLogEntry {
  staffName: string;
  method: string;
  route: string;
  subjectType?: string | null;
  subjectId?: string | null;
  ip?: string | null;
  status: number;
}

export interface AccessLogRow {
  id: string;
  staffName: string;
  method: string;
  route: string;
  subjectType: string | null;
  subjectId: string | null;
  ip: string | null;
  status: number;
  createdAt: string;
}

/**
 * C5.1: the audit trail AdminAccessLogInterceptor writes to on every
 * successful admin request.
 *
 * Raw SQL against `admin_access_log`, not a TypeORM entity+repository —
 * matching PhotoDeletionService, this table may not be migrated yet on a
 * given deploy, and `isMissingTable` is how that degrades (log + continue)
 * instead of 500ing an admin request over a logging write.
 */
@Injectable()
export class AdminAccessLogService {
  private readonly logger = new Logger(AdminAccessLogService.name);

  constructor(private readonly db: DataSource) {}

  /**
   * Best-effort. Never throws — a logging failure must never fail the admin
   * request it's logging.
   */
  async log(entry: AccessLogEntry): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO admin_access_log (staff_name, method, route, subject_type, subject_id, ip, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entry.staffName,
          entry.method,
          entry.route,
          entry.subjectType ?? null,
          entry.subjectId ?? null,
          entry.ip ?? null,
          entry.status,
        ],
      );
    } catch (err: any) {
      if (isMissingTable(err)) {
        this.logger.warn('admin_access_log not migrated; access not recorded.');
        return;
      }
      this.logger.warn(`Failed to write admin access log: ${err?.message ?? err}`);
    }
  }

  private async prune(): Promise<void> {
    try {
      await this.db.query(
        `DELETE FROM admin_access_log WHERE created_at < now() - interval '${RETENTION_MONTHS} months'`,
      );
    } catch (err: any) {
      if (!isMissingTable(err)) {
        this.logger.warn(`Failed to prune admin_access_log: ${err?.message ?? err}`);
      }
    }
  }

  async list(limit = 100, before?: string): Promise<AccessLogRow[]> {
    await this.prune();
    const cappedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    try {
      const rows = before
        ? await this.db.query(
            `SELECT * FROM admin_access_log WHERE created_at < $1 ORDER BY created_at DESC LIMIT $2`,
            [before, cappedLimit],
          )
        : await this.db.query(
            `SELECT * FROM admin_access_log ORDER BY created_at DESC LIMIT $1`,
            [cappedLimit],
          );
      return rows.map(toRow);
    } catch (err: any) {
      if (isMissingTable(err)) return [];
      throw err;
    }
  }
}

function toRow(r: any): AccessLogRow {
  return {
    id: r.id,
    staffName: r.staff_name,
    method: r.method,
    route: r.route,
    subjectType: r.subject_type,
    subjectId: r.subject_id,
    ip: r.ip,
    status: r.status,
    createdAt: r.created_at,
  };
}
