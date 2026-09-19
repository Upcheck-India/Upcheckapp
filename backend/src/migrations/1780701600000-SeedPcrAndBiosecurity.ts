import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed PCR at stocking + per-cycle biosecurity checklist (spec 2026-09-19
 * disease/health D5).
 *
 * Additive and idempotent. The new crop columns are NOT on the Crop entity:
 * they are read and written with raw SQL that tolerates 42703/42P01, so an
 * unapplied migration only hides the seed/checklist UI instead of 500-ing
 * every crop read. Apply before the backend deploy all the same.
 */
export class SeedPcrAndBiosecurity1780701600000 implements MigrationInterface {
  name = 'SeedPcrAndBiosecurity1780701600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "crops"
         ADD COLUMN IF NOT EXISTS "pl_spf" boolean,
         ADD COLUMN IF NOT EXISTS "pl_pcr_date" date,
         ADD COLUMN IF NOT EXISTS "pl_pcr_lab" text,
         ADD COLUMN IF NOT EXISTS "pl_pcr_results" jsonb`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "biosecurity_checks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "crop_id" uuid NOT NULL,
        "item_key" text NOT NULL,
        "done_on" date NOT NULL,
        "done_by" uuid,
        "note" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_biosecurity_checks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_biosecurity_checks_crop" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_biosecurity_checks_crop_item" UNIQUE ("crop_id", "item_key")
      )`,
    );
    // Same posture as every other app table: the API connects as the owner;
    // RLS blocks direct PostgREST access.
    await queryRunner.query(
      `ALTER TABLE "biosecurity_checks" ENABLE ROW LEVEL SECURITY`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "biosecurity_checks"`);
    await queryRunner.query(
      `ALTER TABLE "crops"
         DROP COLUMN IF EXISTS "pl_pcr_results",
         DROP COLUMN IF EXISTS "pl_pcr_lab",
         DROP COLUMN IF EXISTS "pl_pcr_date",
         DROP COLUMN IF EXISTS "pl_spf"`,
    );
  }
}
