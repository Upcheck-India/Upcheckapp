import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: creates `feed_plans` for the Daily Feed
 * Advisor (farmer_features_spec.md §3). References only `ponds`; reversible.
 */
export class CreateFeedPlans1780300200000 implements MigrationInterface {
  name = 'CreateFeedPlans1780300200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feed_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pond_id" uuid NOT NULL,
        "crop_id" uuid,
        "date" date NOT NULL,
        "biomass_kg" numeric NOT NULL,
        "fr_pct" numeric NOT NULL,
        "base_ration_kg" numeric NOT NULL,
        "recommended_kg" numeric NOT NULL,
        "per_meal" text NOT NULL,
        "factors" text NOT NULL,
        "reasons" text,
        "actual_kg" numeric,
        "adherence" numeric,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feed_plans_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_feed_plans_pond') THEN
          ALTER TABLE "feed_plans" ADD CONSTRAINT "FK_feed_plans_pond"
            FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_feed_plans_pond_id" ON "feed_plans" ("pond_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_feed_plans_pond_date" ON "feed_plans" ("pond_id", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "feed_plans"`);
  }
}
