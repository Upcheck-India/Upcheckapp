import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  DATA_DICTIONARY_SEED,
  DATA_DICTIONARY_VERSION,
} from '../measurement/data-dictionary.seed';

/**
 * Additive, idempotent migration for the Measurement keystone (PRD §6.2):
 * creates `data_dictionary` (versioned param catalog) and `measurements`
 * (the unified envelope), then seeds the v1 dictionary.
 *
 * Safe for production:
 *  - `CREATE TABLE/INDEX IF NOT EXISTS` — no-ops if `synchronize` already made
 *    them in a dev DB.
 *  - Only references existing tables (`ponds`); touches no existing table.
 *  - Dictionary seed uses `ON CONFLICT DO NOTHING` so re-runs add nothing.
 *  - Fully reversible (drops only what it created).
 */
export class CreateMeasurementAndDataDictionary1780300000000 implements MigrationInterface {
  name = 'CreateMeasurementAndDataDictionary1780300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── data_dictionary ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "data_dictionary" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "param" text NOT NULL,
        "label" text NOT NULL,
        "category" text NOT NULL,
        "value_type" text NOT NULL DEFAULT 'numeric',
        "unit" text NOT NULL DEFAULT '',
        "allowed_values" text,
        "min_value" numeric,
        "max_value" numeric,
        "version" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_data_dictionary_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_data_dictionary_param_version" ON "data_dictionary" ("param", "version")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_data_dictionary_param" ON "data_dictionary" ("param")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_data_dictionary_category" ON "data_dictionary" ("category")`,
    );

    // ── measurements (the §6.2 envelope) ───────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "measurements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pond_id" uuid NOT NULL,
        "crop_id" uuid,
        "doc" integer,
        "param" text NOT NULL,
        "value_num" numeric,
        "value_text" text,
        "unit" text NOT NULL DEFAULT '',
        "measured_at" timestamp with time zone NOT NULL,
        "time_of_day" text,
        "source" text NOT NULL DEFAULT 'manual',
        "instrument" text,
        "device_id" text,
        "entered_by" uuid,
        "entered_by_role" text,
        "confidence" numeric,
        "is_missing_reason" text,
        "edited_from" uuid,
        "is_superseded" boolean NOT NULL DEFAULT false,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_measurements_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_measurements_pond') THEN
          ALTER TABLE "measurements" ADD CONSTRAINT "FK_measurements_pond"
            FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_measurements_pond_id" ON "measurements" ("pond_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_measurements_crop_id" ON "measurements" ("crop_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_measurements_param" ON "measurements" ("param")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_measurements_entered_by" ON "measurements" ("entered_by")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_measurements_pond_param_time" ON "measurements" ("pond_id", "param", "measured_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_measurements_crop_param_time" ON "measurements" ("crop_id", "param", "measured_at")`,
    );

    // ── seed data dictionary v1 (idempotent) ───────────────────────────
    for (const s of DATA_DICTIONARY_SEED) {
      await queryRunner.query(
        `INSERT INTO "data_dictionary"
           ("param","label","category","value_type","unit","allowed_values","min_value","max_value","version","is_active")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
         ON CONFLICT ("param","version") DO NOTHING`,
        [
          s.param,
          s.label,
          s.category,
          s.valueType,
          s.unit ?? '',
          s.allowedValues ? JSON.stringify(s.allowedValues) : null,
          s.minValue ?? null,
          s.maxValue ?? null,
          DATA_DICTIONARY_VERSION,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "measurements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "data_dictionary"`);
  }
}
