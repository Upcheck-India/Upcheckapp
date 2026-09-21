import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * F3 retention clock (photos spec §F3, "not retroactive on day one").
 *
 * One row per account: when the app first SHOWED that account the "your
 * photos shrink on <date>" notice. PhotoRetentionService never drops a
 * full-size photo for an account earlier than `notice_at + 30 days`, and an
 * account with no row is never downgraded at all. On first deploy the table
 * is empty, so no photo anywhere can be downgraded within 30 days of the
 * deploy — whatever its age.
 *
 * A table, not a `users` column: nothing on the User entity has to change,
 * so an unapplied migration cannot 42703 every user read. Until applied,
 * retention is a no-op (42P01, logged) — the safe direction.
 *
 * Additive and idempotent; RLS on (the backend connects as owner and bypasses
 * it; the anon key must never read it).
 */
export class PhotoRetentionNotices1780702900000 implements MigrationInterface {
  name = 'PhotoRetentionNotices1780702900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "photo_retention_notices" (
        "owner_user_id" uuid NOT NULL,
        "notice_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_photo_retention_notices" PRIMARY KEY ("owner_user_id")
      )`,
    );
    await queryRunner.query(`ALTER TABLE "photo_retention_notices" ENABLE ROW LEVEL SECURITY`);
    // The daily pass looks for full-size objects past 12 months.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_photo_objects_retention" ON "photo_objects" ("uploaded_at") WHERE full_dropped_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_photo_objects_retention"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "photo_retention_notices"`);
  }
}
