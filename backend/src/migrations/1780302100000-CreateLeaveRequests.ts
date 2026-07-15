import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration: `leave_requests` — worker leave request /
 * approval logs (#51, part of the worker HR-module epic #40). No backfill:
 * brand-new subsystem with no legacy data to migrate.
 */
export class CreateLeaveRequests1780302100000 implements MigrationInterface {
  name = 'CreateLeaveRequests1780302100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "leave_requests" (
                "id" uuid NOT NULL,
                "farm_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "start_date" date NOT NULL,
                "end_date" date NOT NULL,
                "reason" text,
                "status" text NOT NULL DEFAULT 'pending',
                "decided_by_id" uuid,
                "decided_at" timestamp with time zone,
                "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                CONSTRAINT "PK_leave_requests_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_leave_requests_farm_id" ON "leave_requests" ("farm_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_leave_requests_user_id" ON "leave_requests" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_leave_requests_status" ON "leave_requests" ("status")`,
    );

    await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_farm_id"
                    FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
    await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_user_id"
                    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
    await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_leave_requests_decided_by_id"
                    FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "leave_requests"`);
  }
}
