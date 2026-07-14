import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: `attendance_records` — worker check-in /
 * check-out logs (#50, part of the worker HR-module epic #40). No backfill:
 * this is a brand-new subsystem with no legacy data to migrate.
 */
export class CreateAttendanceRecords1780302000000
  implements MigrationInterface
{
  name = 'CreateAttendanceRecords1780302000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "attendance_records" (
                "id" uuid NOT NULL,
                "farm_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "check_in_at" timestamp with time zone NOT NULL DEFAULT now(),
                "check_out_at" timestamp with time zone,
                "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                CONSTRAINT "PK_attendance_records_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendance_records_farm_id" ON "attendance_records" ("farm_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendance_records_user_id" ON "attendance_records" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendance_records_check_in_at" ON "attendance_records" ("check_in_at")`,
    );

    await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_attendance_records_farm_id"
                    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
    await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_attendance_records_user_id"
                    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_records"`);
  }
}
