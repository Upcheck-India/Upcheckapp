import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBackupCodesColumn1780301600000 implements MigrationInterface {
    name = 'AddBackupCodesColumn1780301600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "backup_codes" jsonb NOT NULL DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "backup_codes"`);
    }

}
