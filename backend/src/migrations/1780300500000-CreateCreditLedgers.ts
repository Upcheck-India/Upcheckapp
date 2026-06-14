import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: `credit_ledgers` for dealer-credit tracking
 * (farmer_features_spec.md §6). No foreign keys (user-scoped); reversible.
 */
export class CreateCreditLedgers1780300500000 implements MigrationInterface {
  name = 'CreateCreditLedgers1780300500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credit_ledgers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "crop_id" uuid,
        "dealer_name" text NOT NULL,
        "principal" numeric NOT NULL,
        "interest_pct" numeric NOT NULL DEFAULT 0,
        "start_date" date NOT NULL,
        "due_date" date,
        "repaid" numeric NOT NULL DEFAULT 0,
        "notes" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_credit_ledgers_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_credit_ledgers_user_id" ON "credit_ledgers" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_credit_ledgers_crop_id" ON "credit_ledgers" ("crop_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "credit_ledgers"`);
  }
}
