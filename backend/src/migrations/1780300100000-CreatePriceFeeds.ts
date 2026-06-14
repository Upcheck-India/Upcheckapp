import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: creates `price_feeds` for count-based pricing
 * (india §7). Touches no existing table; fully reversible.
 */
export class CreatePriceFeeds1780300100000 implements MigrationInterface {
  name = 'CreatePriceFeeds1780300100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "price_feeds" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "region" text NOT NULL,
        "date" date NOT NULL,
        "prices" text NOT NULL,
        "source" text NOT NULL DEFAULT 'self',
        "entered_by" uuid,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_feeds_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_price_feeds_region" ON "price_feeds" ("region")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_price_feeds_region_date" ON "price_feeds" ("region", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "price_feeds"`);
  }
}
