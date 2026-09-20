import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * farms.state_code / farms.district_code (spec 2026-09-20 compliance C0.2,
 * docs/strategy/farm-location-strategy.md Option B).
 *
 * Additive, nullable, idempotent, reversible — applied by hand, not by
 * `migrationsRun`. NOT YET APPLIED IN PRODUCTION as of this PR; until a human
 * runs `npm run migration:run` against the live DB, code that selects these
 * columns explicitly will 42703. The farms.service.ts read paths that return
 * a farm to a client catch that and degrade (existing `boundary`-style
 * unmigrated column is a pre-existing risk for every full-entity Farm read
 * elsewhere in the codebase; this migration does not add a new pattern of
 * that risk, just two more nullable columns to it).
 */
export class AddFarmLocationDistrict1780702300000 implements MigrationInterface {
  name = 'AddFarmLocationDistrict1780702300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE farms ADD COLUMN IF NOT EXISTS state_code varchar(8) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE farms ADD COLUMN IF NOT EXISTS district_code varchar(64) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE farms DROP COLUMN IF EXISTS district_code`);
    await queryRunner.query(`ALTER TABLE farms DROP COLUMN IF EXISTS state_code`);
  }
}
