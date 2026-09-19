import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Farm shift end + attendance check-out audit (spec 2026-09-14 attendance B.1).
 *
 * Additive, idempotent, reversible — applied by hand, not by `migrationsRun`.
 */
export class AttendanceShiftAndAudit1780700800000 implements MigrationInterface {
  name = 'AttendanceShiftAndAudit1780700800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE farms ADD COLUMN IF NOT EXISTS shift_end_local time NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE farms ADD COLUMN IF NOT EXISTS shift_hours smallint NOT NULL DEFAULT 9`,
    );
    await queryRunner.query(
      `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS checked_out_by uuid NULL REFERENCES users(id) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS check_out_reason varchar(20) NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendance_open" ON attendance_records (user_id) WHERE check_out_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_open"`);
    await queryRunner.query(
      `ALTER TABLE attendance_records DROP COLUMN IF EXISTS check_out_reason`,
    );
    await queryRunner.query(
      `ALTER TABLE attendance_records DROP COLUMN IF EXISTS checked_out_by`,
    );
    await queryRunner.query(`ALTER TABLE farms DROP COLUMN IF EXISTS shift_hours`);
    await queryRunner.query(
      `ALTER TABLE farms DROP COLUMN IF EXISTS shift_end_local`,
    );
  }
}
