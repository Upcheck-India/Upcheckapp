import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Old severity text → mild | moderate | severe. Exported so a spec can hold it
 * equal to `normaliseSeverity` in health-observations/health.constants.ts.
 */
export const LEGACY_SEVERITY: Record<string, 'mild' | 'moderate' | 'severe'> = {
  mild: 'mild',
  low: 'mild',
  minor: 'mild',
  moderate: 'moderate',
  medium: 'moderate',
  severe: 'severe',
  high: 'severe',
  critical: 'severe',
};

const severityCase = () =>
  `CASE lower(trim("severity_at_detection")) ${Object.entries(LEGACY_SEVERITY)
    .map(([from, to]) => `WHEN '${from}' THEN '${to}'`)
    .join(' ')} END`;

/**
 * Health observations + mortality/disease record columns (spec 2026-09-19
 * disease/health D6). `health_observations` replaces the harvest spec's
 * `molt_observations` (never built).
 *
 * Additive and idempotent. Apply BEFORE deploying the backend that reads it:
 * the mortality and disease entities select the new columns on every read.
 * `disease_records.photo_urls` already exists (1746000000000).
 */
export class HealthObservations1780701500000 implements MigrationInterface {
  name = 'HealthObservations1780701500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "health_observations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "pond_id" uuid NOT NULL,
        "crop_id" uuid,
        "observed_on" date NOT NULL,
        "sign" text NOT NULL,
        "level" text NOT NULL,
        "sample_size" int,
        "count" int,
        "molt_deaths" int,
        "source" text NOT NULL,
        "window_key" varchar,
        "photo_urls" text[] NOT NULL DEFAULT '{}',
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_health_observations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_health_observations_pond" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_health_observations_crop" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_health_observations_level" CHECK ("level" IN ('none', 'few', 'many')),
        CONSTRAINT "CHK_health_observations_source" CHECK ("source" IN ('quick', 'sampling', 'harvest', 'tray'))
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_health_observations_pond_day" ON "health_observations" ("pond_id", "observed_on")`,
    );
    // Same posture as every other app table: the API connects as the owner;
    // RLS blocks direct PostgREST access.
    await queryRunner.query(
      `ALTER TABLE "health_observations" ENABLE ROW LEVEL SECURITY`,
    );

    await queryRunner.query(
      `ALTER TABLE "mortality_records"
         ADD COLUMN IF NOT EXISTS "suspected_cause" text,
         ADD COLUMN IF NOT EXISTS "photo_urls" text[] NOT NULL DEFAULT '{}'`,
    );

    await queryRunner.query(
      `ALTER TABLE "disease_records"
         ADD COLUMN IF NOT EXISTS "symptom_signs" text[] NOT NULL DEFAULT '{}',
         ADD COLUMN IF NOT EXISTS "severity" text,
         ADD COLUMN IF NOT EXISTS "affected_pct" numeric,
         ADD COLUMN IF NOT EXISTS "confirmed_by" text,
         ADD COLUMN IF NOT EXISTS "confirmed_on" date,
         ADD COLUMN IF NOT EXISTS "lab_name" text,
         ADD COLUMN IF NOT EXISTS "outcome" text NOT NULL DEFAULT 'ongoing',
         ADD COLUMN IF NOT EXISTS "resolved_on" date`,
    );
    // Three old vocabularies → one. Unknown text stays NULL; the original
    // severity_at_detection is kept as written. Notes are NOT parsed.
    await queryRunner.query(
      `UPDATE "disease_records" SET "severity" = ${severityCase()}
        WHERE "severity" IS NULL AND "severity_at_detection" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "disease_records"
         DROP COLUMN IF EXISTS "resolved_on",
         DROP COLUMN IF EXISTS "outcome",
         DROP COLUMN IF EXISTS "lab_name",
         DROP COLUMN IF EXISTS "confirmed_on",
         DROP COLUMN IF EXISTS "confirmed_by",
         DROP COLUMN IF EXISTS "affected_pct",
         DROP COLUMN IF EXISTS "severity",
         DROP COLUMN IF EXISTS "symptom_signs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mortality_records"
         DROP COLUMN IF EXISTS "photo_urls",
         DROP COLUMN IF EXISTS "suspected_cause"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "health_observations"`);
  }
}
