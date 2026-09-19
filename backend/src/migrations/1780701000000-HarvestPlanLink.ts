import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One revenue path (harvest-and-molt H4): a plan is completed BY a harvest.
 *
 * `harvests.plan_id` records which plan a harvest completed. Nullable (most
 * harvests have no plan), SET NULL on plan delete (deleting a plan must never
 * take a harvest — i.e. revenue — with it). Not an entity column: the service
 * writes it with raw SQL, only when a client sends `planId`, so old builds
 * never reach it.
 *
 * `harvests.plan_conflict_id` records a plan the harvest was logged against
 * but could NOT complete, because it was already completed (another device,
 * an offline replay). The harvest is kept, unlinked; this marks the cycle
 * as a possible duplicate for the Money overview. No FK on purpose: the flag
 * must outlive the plan row.
 *
 * Additive, idempotent, reversible — apply BEFORE the backend
 * that uses it deploys.
 */
export class HarvestPlanLink1780701000000 implements MigrationInterface {
  name = 'HarvestPlanLink1780701000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "harvests"
         ADD COLUMN IF NOT EXISTS "plan_id" uuid NULL,
         ADD COLUMN IF NOT EXISTS "plan_conflict_id" uuid NULL`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_harvests_plan') THEN
           ALTER TABLE "harvests" ADD CONSTRAINT "FK_harvests_plan"
             FOREIGN KEY ("plan_id") REFERENCES "harvest_plans"("id") ON DELETE SET NULL;
         END IF;
       END $$`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_harvests_plan_id" ON "harvests" ("plan_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_harvests_plan_id"`);
    await queryRunner.query(
      `ALTER TABLE "harvests" DROP CONSTRAINT IF EXISTS "FK_harvests_plan"`,
    );
    await queryRunner.query(
      `ALTER TABLE "harvests"
         DROP COLUMN IF EXISTS "plan_conflict_id",
         DROP COLUMN IF EXISTS "plan_id"`,
    );
  }
}
