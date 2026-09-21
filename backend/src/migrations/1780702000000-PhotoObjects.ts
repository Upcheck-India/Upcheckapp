import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * F2 (photos spec 2026-09-20): the per-account storage ledger.
 *
 * One row per stored photo (`path` is unique: it embeds a fresh uuid), written
 * in the same call that puts the object to R2 (`R2StorageService.putImage`).
 * `owner_user_id` is the account whose pool the photo counts against — the
 * farm OWNER for farm photos (a worker's upload counts against the owner),
 * the uploader for avatars and feedback. `record_id` stays NULL until the
 * record that uses the photo saves; still NULL after 24 h = orphan (F1).
 *
 * Usage counts `bytes_full + bytes_thumb`, or `bytes_thumb` alone once F3 has
 * set `full_dropped_at`. The row is removed when the deletion queue
 * (`photo_deletions`) has actually deleted the object.
 *
 * Additive and idempotent. RLS enabled here (the anon key must never read
 * it; the backend connects as the owner and bypasses RLS). Until applied,
 * uploads skip the ledger and the quota (logged), never fail.
 */
export class PhotoObjects1780702000000 implements MigrationInterface {
  name = 'PhotoObjects1780702000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "photo_objects" (
        "path" text NOT NULL,
        "namespace" text NOT NULL,
        "owner_user_id" uuid NOT NULL,
        "farm_id" uuid NULL,
        "pond_id" uuid NULL,
        "crop_id" uuid NULL,
        "entity" text NULL,
        "record_id" uuid NULL,
        "bytes_full" int NOT NULL,
        "bytes_thumb" int NOT NULL,
        "protected" boolean NOT NULL DEFAULT false,
        "full_dropped_at" timestamptz NULL,
        "uploaded_by" uuid NOT NULL,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_photo_objects" PRIMARY KEY ("path")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_photo_objects_owner" ON "photo_objects" ("owner_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_photo_objects_unattached" ON "photo_objects" ("uploaded_at") WHERE "record_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "photo_objects" ENABLE ROW LEVEL SECURITY`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "photo_objects"`);
  }
}
