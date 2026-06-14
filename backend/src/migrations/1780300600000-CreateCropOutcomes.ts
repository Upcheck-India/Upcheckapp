import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: `crop_outcomes` — the frozen ML-label record
 * (data_collection_audit.md §5). One row per crop (unique). Reversible.
 */
export class CreateCropOutcomes1780300600000 implements MigrationInterface {
  name = 'CreateCropOutcomes1780300600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crop_outcomes"`);
  }
}
