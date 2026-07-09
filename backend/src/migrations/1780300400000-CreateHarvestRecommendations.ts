import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: `harvest_recommendations` for the
 * Harvest-Timing engine (farmer_features_spec.md §1). References only `ponds`.
 */
export class CreateHarvestRecommendations1780300400000 implements MigrationInterface {
  name = 'CreateHarvestRecommendations1780300400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "harvest_recommendations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pond_id" uuid NOT NULL,
        "crop_id" uuid,
        "recommend_now" boolean NOT NULL,
        "optimal_day" integer NOT NULL,
        "net_now" numeric NOT NULL,
        "net_optimal" numeric NOT NULL,
        "expected_gain" numeric NOT NULL,
        "result" text NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_harvest_recommendations_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_harvest_rec_pond') THEN
          ALTER TABLE "harvest_recommendations" ADD CONSTRAINT "FK_harvest_rec_pond"
            FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_harvest_rec_pond_id" ON "harvest_recommendations" ("pond_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "harvest_recommendations"`);
  }
}
