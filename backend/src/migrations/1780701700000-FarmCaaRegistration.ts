import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Farm CAA registration number (spec 2026-09-19 disease/health D4), printed on
 * the cycle input record.
 *
 * Additive and idempotent. NOT a Farm entity column: it is read and written
 * with raw SQL that tolerates 42703, so an unapplied migration never breaks a
 * farm read. Apply before the backend deploy all the same.
 */
export class FarmCaaRegistration1780701700000 implements MigrationInterface {
  name = 'FarmCaaRegistration1780701700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "caa_registration_no" text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "farms" DROP COLUMN IF EXISTS "caa_registration_no"`,
    );
  }
}
