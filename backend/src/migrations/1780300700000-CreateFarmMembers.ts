import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: `farm_members` — per-farm team membership
 * (owner / worker). Backfills one `owner` row per existing farm from the legacy
 * `farms.user_id` column so access checks keep working for current owners.
 * Reversible.
 */
export class CreateFarmMembers1780300700000 implements MigrationInterface {
    name = 'CreateFarmMembers1780300700000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "farm_members" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "farm_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "role" character varying(20) NOT NULL DEFAULT 'worker',
                "added_by_id" uuid,
                "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                CONSTRAINT "PK_farm_members_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_farm_members_farm_user" ON "farm_members" ("farm_id", "user_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_farm_members_farm_id" ON "farm_members" ("farm_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_farm_members_user_id" ON "farm_members" ("user_id")`,
        );

        // Foreign keys (idempotent via guarded DO blocks).
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "farm_members" ADD CONSTRAINT "FK_farm_members_farm_id"
                    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "farm_members" ADD CONSTRAINT "FK_farm_members_user_id"
                    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "farm_members" ADD CONSTRAINT "FK_farm_members_added_by_id"
                    FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);

        // Backfill: every farm's primary owner becomes an 'owner' member.
        // Includes soft-deleted farms so a restore keeps its owner row; runtime
        // access checks reject soft-deleted farms separately. Idempotent via the
        // unique (farm_id, user_id) index.
        await queryRunner.query(`
            INSERT INTO "farm_members" ("id", "farm_id", "user_id", "role", "added_by_id", "created_at")
            SELECT uuid_generate_v4(), f."id", f."user_id", 'owner', f."user_id", now()
            FROM "farms" f
            ON CONFLICT ("farm_id", "user_id") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "farm_members"`);
    }
}
