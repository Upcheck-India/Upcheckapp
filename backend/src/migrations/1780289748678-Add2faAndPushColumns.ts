import { MigrationInterface, QueryRunner } from 'typeorm';

export class Add2faAndPushColumns1780289748678 implements MigrationInterface {
  name = 'Add2faAndPushColumns1780289748678';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent (IF NOT EXISTS) so ops can safely (re-)apply this to an
    // environment where 2FA is 500ing on missing columns (issue #32).
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_2fa_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "push_token" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ALTER COLUMN "carrying_capacity_kg_m2" SET DEFAULT '1.25'`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ALTER COLUMN "carrying_capacity_kg_m2" SET DEFAULT '1.25'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "crops" ALTER COLUMN "carrying_capacity_kg_m2" SET DEFAULT 1.25`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ALTER COLUMN "carrying_capacity_kg_m2" SET DEFAULT 1.25`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "push_token"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "totp_secret"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_2fa_enabled"`);
  }
}
