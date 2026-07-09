import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: task-module workflow columns (blueprint §17).
 *   - type             : task category (FEED / WATER_TEST / SAMPLING / ...)
 *   - time_window_start / time_window_end : the daily window the task must run in
 *   - recurrence_rule   : RFC-5545-style rule string for recurring series
 *   - parent_task_id    : links generated instances back to their series origin
 *   - verified_at / verified_by_id : manager verification of a completed task
 * Reversible.
 */
export class AddTaskWorkflowColumns1780301200000 implements MigrationInterface {
  name = 'AddTaskWorkflowColumns1780301200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'OTHER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "time_window_start" time`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "time_window_end" time`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "recurrence_rule" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "parent_task_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "verified_by_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tasks_parent_task_id" ON "tasks" ("parent_task_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_parent_task_id"`);
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN IF EXISTS "verified_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN IF EXISTS "verified_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN IF EXISTS "parent_task_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN IF EXISTS "recurrence_rule"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN IF EXISTS "time_window_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN IF EXISTS "time_window_start"`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "type"`);
  }
}
