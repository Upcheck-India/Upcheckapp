import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: adds `created_by_id` / `updated_by_id` audit
 * columns to every operational log table, so each row records who logged and
 * last edited it. Nullable (historical rows stay null); FK to users with
 * ON DELETE SET NULL. Reversible.
 */
export class AddOperationalAuditColumns1780300800000 implements MigrationInterface {
    name = 'AddOperationalAuditColumns1780300800000';

    private readonly tables = [
        'water_quality_records',
        'feed_records',
        'sampling_data',
        'mortality_records',
        'treatments',
        'disease_records',
        'plankton_data',
        'microbiology_data',
        'chemical_data',
        'feeding_tray_checks',
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const t of this.tables) {
            await queryRunner.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "created_by_id" uuid`);
            await queryRunner.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "updated_by_id" uuid`);
            await queryRunner.query(`
                DO $$ BEGIN
                    ALTER TABLE "${t}" ADD CONSTRAINT "FK_${t}_created_by_id"
                        FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            `);
            await queryRunner.query(`
                DO $$ BEGIN
                    ALTER TABLE "${t}" ADD CONSTRAINT "FK_${t}_updated_by_id"
                        FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const t of this.tables) {
            await queryRunner.query(`ALTER TABLE "${t}" DROP CONSTRAINT IF EXISTS "FK_${t}_created_by_id"`);
            await queryRunner.query(`ALTER TABLE "${t}" DROP CONSTRAINT IF EXISTS "FK_${t}_updated_by_id"`);
            await queryRunner.query(`ALTER TABLE "${t}" DROP COLUMN IF EXISTS "created_by_id"`);
            await queryRunner.query(`ALTER TABLE "${t}" DROP COLUMN IF EXISTS "updated_by_id"`);
        }
    }
}
