import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1771597711215 implements MigrationInterface {
  name = 'InitialSchema1771597711215';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "email"`);
    await queryRunner.query(`ALTER TABLE "profiles" ADD "email" text`);
    await queryRunner.query(
      `ALTER TABLE "crops" ALTER COLUMN "carrying_capacity_kg_m2" SET DEFAULT '1.25'`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ALTER COLUMN "carrying_capacity_kg_m2" SET DEFAULT '1.25'`,
    );

    // Fix NULL values before applying NOT NULL constraints
    await queryRunner.query(
      `UPDATE "ponds" SET "geometry_type" = 'rectangular' WHERE "geometry_type" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "ponds" SET "construction_type" = 'earthen' WHERE "construction_type" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "ponds" SET "depth_m" = 1.0 WHERE "depth_m" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "ponds" SET "calculated_area_m2" = 0 WHERE "calculated_area_m2" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "ponds" ALTER COLUMN "geometry_type" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ponds" ALTER COLUMN "construction_type" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ponds" ALTER COLUMN "depth_m" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ponds" ALTER COLUMN "calculated_area_m2" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ponds" ALTER COLUMN "calculated_area_m2" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ponds" ALTER COLUMN "depth_m" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ponds" ALTER COLUMN "construction_type" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ponds" ALTER COLUMN "geometry_type" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ALTER COLUMN "carrying_capacity_kg_m2" SET DEFAULT 1.25`,
    );
    await queryRunner.query(
      `ALTER TABLE "crops" ALTER COLUMN "carrying_capacity_kg_m2" SET DEFAULT 1.25`,
    );
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "email"`);
    await queryRunner.query(`ALTER TABLE "profiles" ADD "email" text`);
  }
}
