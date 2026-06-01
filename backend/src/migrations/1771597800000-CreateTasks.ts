import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Additive, idempotent migration: creates the `tasks` table for the Task Board.
 *
 * Safe for production:
 *  - `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` — no-ops if the
 *    table already exists (e.g. created earlier by `synchronize` in a dev DB).
 *  - Touches no existing table; foreign keys only reference existing tables.
 *  - Fully reversible via `down` (drops only what it created).
 */
export class CreateTasks1771597800000 implements MigrationInterface {
    name = 'CreateTasks1771597800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tasks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "farm_id" uuid NOT NULL,
                "pond_id" uuid,
                "crop_id" uuid,
                "title" text NOT NULL,
                "description" text,
                "status" text NOT NULL DEFAULT 'open',
                "priority" text NOT NULL DEFAULT 'medium',
                "due_date" date,
                "assigned_to_id" uuid,
                "created_by_id" uuid,
                "completed_at" timestamp with time zone,
                "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id")
            )
        `);

        // Foreign keys (guarded so re-running is safe).
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasks_farm') THEN
                    ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_farm"
                        FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasks_pond') THEN
                    ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_pond"
                        FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE SET NULL;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasks_crop') THEN
                    ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_crop"
                        FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE SET NULL;
                END IF;
            END $$;
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_farm_id" ON "tasks" ("farm_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_pond_id" ON "tasks" ("pond_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_crop_id" ON "tasks" ("crop_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_status" ON "tasks" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_assigned_to_id" ON "tasks" ("assigned_to_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "tasks"`);
    }
}
