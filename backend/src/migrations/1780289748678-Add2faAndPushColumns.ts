import { MigrationInterface, QueryRunner } from 'typeorm';

export class Add2faAndPushColumns1780289748678 implements MigrationInterface {
  name = 'Add2faAndPushColumns1780289748678';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_2fa_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "totp_secret" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD "push_token" text`);
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
