import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: `disease_risk_snapshots` for the Disease
 * Early-Warning engine (farmer_features_spec.md §2). References only `ponds`.
 */
export class CreateDiseaseRiskSnapshots1780300300000 implements MigrationInterface {
  name = 'CreateDiseaseRiskSnapshots1780300300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "disease_risk_snapshots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pond_id" uuid NOT NULL,
        "crop_id" uuid,
        "date" date NOT NULL,
        "risks" text NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_disease_risk_snapshots_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_disease_risk_pond') THEN
          ALTER TABLE "disease_risk_snapshots" ADD CONSTRAINT "FK_disease_risk_pond"
            FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disease_risk_pond_id" ON "disease_risk_snapshots" ("pond_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disease_risk_pond_date" ON "disease_risk_snapshots" ("pond_id", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "disease_risk_snapshots"`);
  }
}
