import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin photo-quota management (spec: admin photo-quota, item 2): a
 * per-account override of PhotoLedgerService.quotaFor()'s default
 * PHOTO_QUOTA, plus an append-only history of every change to it.
 *
 * `photo_quota_overrides` holds the CURRENT override only (one row per
 * account it applies to) — `quotaFor()` reads this table and falls back to
 * PHOTO_QUOTA when no row exists. `reason` and `set_by` are NOT NULL: a
 * limit change with no reason or no attributable staff member is not
 * something this table can express.
 *
 * `photo_quota_override_events` is separate from (not instead of)
 * `admin_access_log`: the access log records THAT a staffer hit this route,
 * not the reason text or the before/after limits, and it prunes itself
 * after 12 months (AdminAccessLogService.RETENTION_MONTHS) — a
 * limit-change reason is exactly the kind of thing that needs to survive
 * longer than that and be queryable by account. Every set/reset appends a
 * row here; nothing here is ever updated or deleted.
 *
 * Additive and idempotent. RLS enabled on both (the anon key must never
 * read either; the backend connects as the owner and bypasses RLS). Until
 * applied, PhotoLedgerService.quotaFor() degrades to the flat default
 * (logged, never throws) and the admin endpoints fail-safe the same way.
 */
export class PhotoQuotaOverrides1780702700000 implements MigrationInterface {
  name = 'PhotoQuotaOverrides1780702700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "photo_quota_overrides" (
        "user_id" uuid NOT NULL,
        "max_photos" int NOT NULL,
        "max_bytes" bigint NOT NULL,
        "reason" text NOT NULL,
        "set_by" text NOT NULL,
        "set_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_photo_quota_overrides" PRIMARY KEY ("user_id")
      )`,
    );
    await queryRunner.query(`ALTER TABLE "photo_quota_overrides" ENABLE ROW LEVEL SECURITY`);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "photo_quota_override_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "action" text NOT NULL,
        "max_photos" int NULL,
        "max_bytes" bigint NULL,
        "reason" text NOT NULL,
        "set_by" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_photo_quota_override_events" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_photo_quota_override_events_user" ON "photo_quota_override_events" ("user_id", "created_at")`,
    );
    await queryRunner.query(`ALTER TABLE "photo_quota_override_events" ENABLE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "photo_quota_override_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "photo_quota_overrides"`);
  }
}
