import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

const isMissingSchema = (err: any) =>
  ['42P01', '42703'].includes(err?.code ?? err?.driverError?.code);

/**
 * F8.1: the one-line acknowledgement shown at a user's FIRST photo upload
 * anywhere ("Farm records only. Personal photos are not allowed here.").
 * Stored on `users.photo_terms_ack_at`, deliberately NOT on the `User` entity
 * (AGENTS.md: a new users column must not break `PUBLIC_USER_SELECT` / any
 * default `find()` before the migration is applied) — read/written here with
 * raw SQL, guarded the same way as every other unmigrated column.
 */
@Injectable()
export class PhotoTermsAckService {
  private readonly logger = new Logger(PhotoTermsAckService.name);

  constructor(private readonly db: DataSource) {}

  /** Null = never shown (or not migrated yet — same UI treatment). */
  async ackedAt(userId: string): Promise<string | null> {
    try {
      const [row] = await this.db.query(
        `SELECT photo_terms_ack_at FROM users WHERE id = $1`,
        [userId],
      );
      return row?.photo_terms_ack_at ?? null;
    } catch (err) {
      if (isMissingSchema(err)) return null;
      throw err;
    }
  }

  /** Idempotent: acknowledging twice keeps the first timestamp. */
  async acknowledge(userId: string): Promise<{ ackedAt: string | null }> {
    try {
      const [row] = await this.db.query(
        `UPDATE users SET photo_terms_ack_at = COALESCE(photo_terms_ack_at, now())
         WHERE id = $1 RETURNING photo_terms_ack_at`,
        [userId],
      );
      return { ackedAt: row?.photo_terms_ack_at ?? null };
    } catch (err) {
      if (isMissingSchema(err)) {
        this.logger.warn('users.photo_terms_ack_at not migrated; ack was not saved.');
        return { ackedAt: null };
      }
      throw err;
    }
  }
}
