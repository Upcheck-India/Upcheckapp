import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: `ponds.aerator_count` — number of aerator
 * units installed in the pond. Paired with `installed_aerator_hp` (total HP) so
 * the Aeration & Power optimizer can reason about both unit count and capacity.
 * Reversible.
 */
export class AddPondAeratorCount1780301100000 implements MigrationInterface {
    name = 'AddPondAeratorCount1780301100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ponds" ADD COLUMN IF NOT EXISTS "aerator_count" integer`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ponds" DROP COLUMN IF EXISTS "aerator_count"`);
    }
}
