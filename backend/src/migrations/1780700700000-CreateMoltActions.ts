import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Manual ticks on the per-pond molt checklist (molt window, spec 2026-09-14 §1).
 *
 * Only MANUAL items are stored; auto items are derived from logs at read time.
 * Un-tick deletes the row, so the UNIQUE key is the whole state.
 *
 * Additive, idempotent, reversible — applied by hand, not by `migrationsRun`.
 */
export class CreateMoltActions1780700700000 implements MigrationInterface {
  name = 'CreateMoltActions1780700700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "molt_actions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "pond_id" uuid NOT NULL,
        "window_key" varchar NOT NULL,
        "action_key" varchar NOT NULL,
        "done_by" uuid,
        "done_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_molt_actions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_molt_actions_pond_window_action" UNIQUE ("pond_id", "window_key", "action_key"),
        CONSTRAINT "FK_molt_actions_pond" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE
      )`,
    );
    // Same posture as every other app table (1780301300000): the API connects
    // as the table owner; RLS blocks direct PostgREST access.
    await queryRunner.query(
      `ALTER TABLE "molt_actions" ENABLE ROW LEVEL SECURITY`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "molt_actions"`);
  }
}
