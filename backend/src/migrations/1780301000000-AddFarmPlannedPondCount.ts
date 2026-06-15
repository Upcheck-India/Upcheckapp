import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: `farms.planned_pond_count` — the number of
 * ponds an owner declares during first-run farm setup. Captured up front so the
 * next step (guided pond creation) knows how many ponds to scaffold. Reversible.
 */
export class AddFarmPlannedPondCount1780301000000 implements MigrationInterface {
    name = 'AddFarmPlannedPondCount1780301000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "planned_pond_count" integer`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "farms" DROP COLUMN IF EXISTS "planned_pond_count"`);
    }
}
