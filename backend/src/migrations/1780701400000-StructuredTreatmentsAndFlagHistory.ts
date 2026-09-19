import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Structured treatments (disease spec D2) + banned-flag history (D3).
 *
 * - treatments: category, ingredient_keys, product_name, reason, dose_value,
 *   dose_unit, disease_record_id (FK SET NULL), flag_history.
 * - disease_records: flag_history.
 * - inventory_movements: treatment_id (no FK, same as feed_record_id — the
 *   movement must outlive a hard-deleted log).
 * - inventory: ingredient_keys (warn when a banned product is stocked).
 *
 * Additive, idempotent, reversible — applied by hand BEFORE the backend that
 * reads it (`migrationsRun` is false). The Treatment and InventoryItem
 * entities select these columns, so an unapplied migration 500s those reads.
 */
export class StructuredTreatmentsAndFlagHistory1780701400000
  implements MigrationInterface
{
  name = 'StructuredTreatmentsAndFlagHistory1780701400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "treatments"
        ADD COLUMN IF NOT EXISTS "category" text NULL,
        ADD COLUMN IF NOT EXISTS "ingredient_keys" text[] NULL,
        ADD COLUMN IF NOT EXISTS "product_name" text NULL,
        ADD COLUMN IF NOT EXISTS "reason" text NULL,
        ADD COLUMN IF NOT EXISTS "dose_value" numeric NULL,
        ADD COLUMN IF NOT EXISTS "dose_unit" text NULL,
        ADD COLUMN IF NOT EXISTS "disease_record_id" uuid NULL,
        ADD COLUMN IF NOT EXISTS "flag_history" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "treatments"
          ADD CONSTRAINT "FK_treatments_disease_record"
          FOREIGN KEY ("disease_record_id") REFERENCES "disease_records"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_treatments_disease_record_id" ON "treatments" ("disease_record_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "disease_records" ADD COLUMN IF NOT EXISTS "flag_history" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "treatment_id" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "ingredient_keys" text[] NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory" DROP COLUMN IF EXISTS "ingredient_keys"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" DROP COLUMN IF EXISTS "treatment_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disease_records" DROP COLUMN IF EXISTS "flag_history"`,
    );
    await queryRunner.query(
      `ALTER TABLE "treatments" DROP CONSTRAINT IF EXISTS "FK_treatments_disease_record"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_treatments_disease_record_id"`);
    await queryRunner.query(`
      ALTER TABLE "treatments"
        DROP COLUMN IF EXISTS "flag_history",
        DROP COLUMN IF EXISTS "disease_record_id",
        DROP COLUMN IF EXISTS "dose_unit",
        DROP COLUMN IF EXISTS "dose_value",
        DROP COLUMN IF EXISTS "reason",
        DROP COLUMN IF EXISTS "product_name",
        DROP COLUMN IF EXISTS "ingredient_keys",
        DROP COLUMN IF EXISTS "category"
    `);
  }
}
