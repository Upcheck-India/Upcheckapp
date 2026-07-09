import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `feeding_tray_checks.crop_id` is the filter predicate in
 * feeding-tray-checks.service findAll and pond-context's per-check lookup,
 * but the FK column has no index in Postgres (AUDIT id 146). Additive,
 * idempotent, reversible — mirrors 1780301400000-AddTransactionsFarmIdIndex.
 */
export class AddFeedingTrayChecksCropIdIndex1780301700000
  implements MigrationInterface
{
  name = 'AddFeedingTrayChecksCropIdIndex1780301700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_feeding_tray_checks_crop_id" ON "feeding_tray_checks" ("crop_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_feeding_tray_checks_crop_id"`,
    );
  }
}
