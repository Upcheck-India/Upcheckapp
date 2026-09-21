import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C5.1: who read or changed what through the admin dashboard, and when.
 *
 * Written by AdminAccessLogInterceptor on every successful admin
 * request — AdminKeyGuard attaches the staff identity (per-person key, or
 * "shared-key" during the transition) as `req.adminStaff`, and the
 * interceptor logs it here. `subject_type`/`subject_id` are whatever the
 * route's `:id` param names (feedback_id, announcement_id, ...); null where
 * the route has none (e.g. the photo-drain sweep).
 *
 * Additive; not applied by this change. Until migrated,
 * AdminAccessLogService.log() catches 42P01 and logs a warning instead of
 * failing the admin request (isMissingTable pattern, see AGENTS.md).
 *
 * ENABLE ROW LEVEL SECURITY explicitly rather than relying on the later
 * catch-all migration — this table holds an audit trail of admin access to
 * farmer data, and 1780701950000 exists precisely because a table left off
 * that catch-all was exposed to the anon key.
 */
export class AdminAccessLog1780702500000 implements MigrationInterface {
  name = 'AdminAccessLog1780702500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "admin_access_log" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "staff_name" text NOT NULL,
        "method" text NOT NULL,
        "route" text NOT NULL,
        "subject_type" text NULL,
        "subject_id" text NULL,
        "ip" text NULL,
        "status" int NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_access_log" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_admin_access_log_created_at" ON "admin_access_log" ("created_at")`,
    );
    await queryRunner.query(`ALTER TABLE "admin_access_log" ENABLE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_access_log"`);
  }
}
