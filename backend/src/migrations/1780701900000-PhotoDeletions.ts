import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * F1 (photos spec 2026-09-20): the durable R2 deletion queue.
 *
 * Every delete path writes the intent here, in the same transaction as the
 * delete; `PhotoDeletionService.drain` removes the objects later. A row is
 * never dropped without a successful R2 delete — `done_at` + `reason` is the
 * proof a deletion request was honoured.
 *
 * `path` is relative to `namespace` (thumb derived). A path ending in `/` is
 * a PREFIX (`<farmId>/`, `<userId>/`): everything under it is deleted.
 * `next_attempt_at` carries the exponential backoff.
 *
 * Additive and idempotent. Until applied, callers log and fall back to the
 * pre-F1 behaviour (PhotoDeletionService checks `to_regclass` first).
 */
export class PhotoDeletions1780701900000 implements MigrationInterface {
  name = 'PhotoDeletions1780701900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "photo_deletions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "namespace" text NOT NULL,
        "path" text NOT NULL,
        "reason" text NOT NULL,
        "requested_by" uuid NULL,
        "requested_at" timestamptz NOT NULL DEFAULT now(),
        "attempts" int NOT NULL DEFAULT 0,
        "last_error" text NULL,
        "next_attempt_at" timestamptz NOT NULL DEFAULT now(),
        "done_at" timestamptz NULL,
        CONSTRAINT "PK_photo_deletions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_photo_deletions_ns_path_reason" UNIQUE ("namespace", "path", "reason"),
        CONSTRAINT "CHK_photo_deletions_reason" CHECK ("reason" IN (
          'record_deleted', 'photo_removed', 'pond_deleted', 'cycle_deleted',
          'farm_deleted', 'account_deleted', 'retention_full', 'user_cleared', 'orphan'))
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_photo_deletions_pending" ON "photo_deletions" ("next_attempt_at") WHERE "done_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "photo_deletions"`);
  }
}
