import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `transactions.farm_id` was the one hot FK left without an index (every
 * sibling table — ponds, crops, feed_records, expenses, etc. — got one in
 * 1740487200000-DatabaseQualityFixes). findAll/getSummaryByFarm both filter
 * by farm_id, so large farms were doing sequential scans. Additive,
 * idempotent, reversible.
 */
export class AddTransactionsFarmIdIndex1780301400000 implements MigrationInterface {
    name = 'AddTransactionsFarmIdIndex1780301400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_transactions_farm_id" ON "transactions" ("farm_id")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_farm_id"`);
    }
}
