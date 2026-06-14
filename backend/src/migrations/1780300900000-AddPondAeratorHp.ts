import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: `ponds.installed_aerator_hp` — total installed
 * aerator power (HP), so the Aeration & Power optimizer auto-fills it instead of
 * re-asking the farmer every session. Reversible.
 */
export class AddPondAeratorHp1780300900000 implements MigrationInterface {
    name = 'AddPondAeratorHp1780300900000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ponds" ADD COLUMN IF NOT EXISTS "installed_aerator_hp" numeric`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ponds" DROP COLUMN IF EXISTS "installed_aerator_hp"`);
    }
}
