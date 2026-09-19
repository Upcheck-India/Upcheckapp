import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Farm price book (harvest-and-molt H5): the farm's own buyer quotes.
 *
 * `bands` is `[{ count, price }]` (1..12 entries). `source` is 'quote' (typed
 * on the "Today's quote" sheet) or 'harvest' (derived from a graded harvest's
 * priced lines, in the harvest's own transaction). Read and write need
 * VIEW_FINANCIALS. Not an entity: PricingService reads/writes it with raw SQL
 * behind the 42P01 fail-safe, so an unapplied migration degrades to "no quote".
 *
 * Additive, idempotent, reversible — apply BEFORE the backend that uses it
 * deploys.
 */
export class FarmPriceQuotes1780701100000 implements MigrationInterface {
  name = 'FarmPriceQuotes1780701100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "farm_price_quotes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "farm_id" uuid NOT NULL,
        "quoted_on" date NOT NULL,
        "buyer" text NULL,
        "bands" jsonb NOT NULL,
        "source" text NOT NULL,
        "harvest_id" uuid NULL,
        "created_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_farm_price_quotes" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_farm_price_quotes_source" CHECK ("source" IN ('quote', 'harvest')),
        CONSTRAINT "FK_farm_price_quotes_farm" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_farm_price_quotes_harvest" FOREIGN KEY ("harvest_id") REFERENCES "harvests"("id") ON DELETE SET NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_farm_price_quotes_farm_quoted"
         ON "farm_price_quotes" ("farm_id", "quoted_on" DESC, "created_at" DESC)`,
    );
    // Same posture as every other app table (1780301300000).
    await queryRunner.query(
      `ALTER TABLE "farm_price_quotes" ENABLE ROW LEVEL SECURITY`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "farm_price_quotes"`);
  }
}
