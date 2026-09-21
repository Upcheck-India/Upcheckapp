import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ConsentRowDto } from './dto/record-consents.dto';
import type { ConsentKind, TrainingScope } from './consent-kinds';

/** 42P01 undefined_table — user_consents is new and migrations are manual. */
function isMissingTable(err: any): boolean {
  return (err?.code ?? err?.driverError?.code) === '42P01';
}

export interface LatestConsent {
  kind: ConsentKind;
  granted: boolean;
  docVersion: string;
  locale: string;
  source: string;
  createdAt: Date;
}

/**
 * Rows in chronological order → the LAST row per key. Pure, so the one rule
 * that decides who may be trained on is testable without a database.
 */
export function latestPerKey<T>(rows: T[], key: (r: T) => string): Map<string, T> {
  const out = new Map<string, T>();
  for (const r of rows) out.set(key(r), r);
  return out;
}

@Injectable()
export class ConsentsService {
  private readonly logger = new Logger(ConsentsService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Append rows. Idempotent on the client-minted id, so an offline replay of
   * the same batch inserts nothing new. Never updates: a withdrawal arrives
   * as its own row.
   */
  async record(userId: string, rows: ConsentRowDto[]): Promise<{ recorded: number }> {
    const values: unknown[] = [];
    const tuples = rows.map((r, i) => {
      const b = i * 7;
      values.push(r.id, userId, r.kind, r.granted, r.docVersion, r.locale, r.source);
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7})`;
    });
    try {
      await this.dataSource.query(
        `INSERT INTO user_consents (id, user_id, kind, granted, doc_version, locale, source)
         VALUES ${tuples.join(', ')}
         ON CONFLICT (id) DO NOTHING`,
        values,
      );
      return { recorded: rows.length };
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      // Accept so the client's queue drains; the device keeps its own copy.
      this.logger.warn('user_consents missing (migration 1780702400000 not applied) — consent not stored');
      return { recorded: 0 };
    }
  }

  /** The latest row per kind for one user. */
  async latestForUser(userId: string): Promise<LatestConsent[]> {
    let rows: any[];
    try {
      rows = await this.dataSource.query(
        `SELECT kind, granted, doc_version, locale, source, created_at
           FROM user_consents WHERE user_id = $1
          ORDER BY created_at ASC, id ASC`,
        [userId],
      );
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      this.logger.warn('user_consents missing (migration 1780702400000 not applied)');
      return [];
    }
    return [...latestPerKey(rows, (r) => r.kind).values()].map((r) => ({
      kind: r.kind,
      granted: r.granted,
      docVersion: r.doc_version,
      locale: r.locale,
      source: r.source,
      createdAt: r.created_at,
    }));
  }

  /**
   * THE filter every training-dataset build must use (spec C3): only users
   * whose LATEST row for this scope is granted=true, at the time of the build.
   * A user who granted and later withdrew is excluded. Fails CLOSED: a missing
   * table means nobody has consented.
   *
   * ponytail: reads every row of one kind and reduces in memory — fine for an
   * offline batch job; move to DISTINCT ON if the table gets large.
   */
  async usersWithCurrentTrainingConsent(scope: TrainingScope): Promise<string[]> {
    const kind: ConsentKind = scope === 'photos' ? 'ml_training_photos' : 'ml_training_records';
    let rows: Array<{ user_id: string; granted: boolean }>;
    try {
      rows = await this.dataSource.query(
        `SELECT user_id, granted FROM user_consents
          WHERE kind = $1
          ORDER BY created_at ASC, id ASC`,
        [kind],
      );
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      return [];
    }
    return [...latestPerKey(rows, (r) => r.user_id).values()]
      .filter((r) => r.granted === true)
      .map((r) => r.user_id);
  }
}
