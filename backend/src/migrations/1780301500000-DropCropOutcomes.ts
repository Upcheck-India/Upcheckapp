import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop `crop_outcomes` — the crop-outcome module was removed as dead code
 * (no backend consumer, no reachable UI). The original CreateCropOutcomes
 * migration is kept in the chain for history; this migration retires the
 * now-unmapped table. Reversible: `down` recreates it verbatim.
 */
export class DropCropOutcomes1780301500000 implements MigrationInterface {
  name = 'DropCropOutcomes1780301500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crop_outcomes"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crop_outcomes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "crop_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "final_sr_pct" numeric,
        "final_fcr" numeric,
        "final_count" numeric,
        "total_yield_kg" numeric,
        "productivity_t_ha" numeric,
        "adg_mean" numeric,
        "cultivation_days" integer,
        "disease_occurred" text,
        "disease_onset_doc" integer,
        "disease_confirmed_by" text,
        "emergency_harvest" boolean NOT NULL DEFAULT false,
        "crash" boolean NOT NULL DEFAULT false,
        "revenue" numeric,
        "total_cost" numeric,
        "profit" numeric,
        "cop_per_kg" numeric,
        "margin_pct" numeric,
        "roi_pct" numeric,
        "outcome_class" text NOT NULL,
        "data_completeness_score" numeric,
        "frozen_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crop_outcomes_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_crop_outcomes_crop_id" ON "crop_outcomes" ("crop_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_crop_outcomes_user_id" ON "crop_outcomes" ("user_id")`,
    );
  }
}
