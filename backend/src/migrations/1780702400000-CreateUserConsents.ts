import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * user_consents (spec 2026-09-20 compliance C2.1 + C3).
 *
 * APPEND-ONLY. A withdrawal is a new row with granted=false, never an UPDATE;
 * the history is the evidence. No FK to users on purpose: C6 keeps consent
 * records as evidence, and the row carries nothing but the user id.
 *
 * kind: 'terms' | 'privacy' | 'analytics' | 'crash'
 *     | 'ml_training_records' | 'ml_training_photos'
 * (validated in the API — see consents/consent-kinds.ts — not by a CHECK, so a
 * new kind does not need a migration).
 *
 * RLS is enabled here, in the same migration that creates the table: the
 * backend connects as the table owner and bypasses it, and without it the
 * anon key in the app could read and write every row (see 1780701950000).
 *
 * NOT APPLIED IN PRODUCTION by this PR. Until a human runs
 * `npm run migration:run`, ConsentsService treats 42P01 as "accept and no-op".
 */
export class CreateUserConsents1780702400000 implements MigrationInterface {
  name = 'CreateUserConsents1780702400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_consents (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        kind text NOT NULL,
        granted boolean NOT NULL,
        doc_version text NOT NULL,
        locale text NOT NULL,
        source text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_consents_user_kind_created
         ON user_consents (user_id, kind, created_at DESC)`,
    );
    await queryRunner.query(
      `ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_consents`);
  }
}
