import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBackupCodesColumn1780301600000 implements MigrationInterface {
  name = 'AddBackupCodesColumn1780301600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent so ops can safely (re-)apply this to an environment where 2FA
    // is 500ing because the column was never migrated (issue #32), without
    // failing on "column already exists" if it was partially applied.
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "backup_codes" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "backup_codes"`);
  }
}
