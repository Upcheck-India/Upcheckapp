import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Graded harvest record (harvest-and-molt H1/H2).
 *
 * - `harvest_grades`: one row per line of the buyer's weighing slip. The
 *   `harvests` row stays the aggregate, so every existing reader is unchanged.
 * - `harvests.rejected_kg/rejected_reason/pieces/pieces_estimated`: deductions
 *   and the piece count that partial harvests subtract from live population.
 * - `crops.close_reason`: why a cycle was closed without a harvest ('lost' /
 *   'other'). The spec said "store it in notes", but crops has no notes column.
 *
 * None of these are entity columns: the service reads/writes them with raw SQL
 * behind the 42P01/42703 fail-safe, so an unapplied migration degrades instead
 * of 500-ing every harvest and crop read. Additive, idempotent, reversible —
 * applied by hand BEFORE the backend that uses it deploys.
 */
export class CreateHarvestGrades1780700900000 implements MigrationInterface {
  name = 'CreateHarvestGrades1780700900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "harvest_grades" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "harvest_id" uuid NOT NULL,
        "count_per_kg" numeric NULL,
        "weight_kg" numeric NOT NULL,
        "price_per_kg" numeric NULL,
        "sort_order" smallint NOT NULL DEFAULT 0,
        CONSTRAINT "PK_harvest_grades" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_harvest_grades_weight" CHECK ("weight_kg" > 0),
        CONSTRAINT "FK_harvest_grades_harvest" FOREIGN KEY ("harvest_id") REFERENCES "harvests"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_harvest_grades_harvest_id" ON "harvest_grades" ("harvest_id")`,
    );
    // Same posture as every other app table (1780301300000).
    await queryRunner.query(
      `ALTER TABLE "harvest_grades" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "harvests"
         ADD COLUMN IF NOT EXISTS "rejected_kg" numeric NULL,
         ADD COLUMN IF NOT EXISTS "rejected_reason" text NULL,
         ADD COLUMN IF NOT EXISTS "pieces" int NULL,
         ADD COLUMN IF NOT EXISTS "pieces_estimated" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ADD COLUMN IF NOT EXISTS "close_reason" text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "crops" DROP COLUMN IF EXISTS "close_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "harvests"
         DROP COLUMN IF EXISTS "pieces_estimated",
         DROP COLUMN IF EXISTS "pieces",
         DROP COLUMN IF EXISTS "rejected_reason",
         DROP COLUMN IF EXISTS "rejected_kg"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "harvest_grades"`);
  }
}
