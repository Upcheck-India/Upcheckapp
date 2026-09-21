import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C4 (admin dashboard "better report handling"): a free-text assignee on
 * `feedback_reports` and an append-only `feedback_notes` table for internal
 * staff notes. Additive and idempotent — same shape as PhotoDeletions
 * (1780701900000): callers degrade on 42P01 until this runs.
 *
 * NOT APPLIED by this change. Robin (or whoever runs migrations) must run
 * `npm run migration:run` against the real DB before these columns/table
 * exist — until then FeedbackService's isMissingTable() fallback keeps the
 * rest of the feedback API working exactly as before.
 */
export class FeedbackAssigneeAndNotes1780702600000
  implements MigrationInterface
{
  name = 'FeedbackAssigneeAndNotes1780702600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "feedback_reports" ADD COLUMN IF NOT EXISTS "assignee" varchar(120) NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "feedback_notes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "report_id" uuid NOT NULL,
        "author" varchar(120) NULL,
        "note" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feedback_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_feedback_notes_report" FOREIGN KEY ("report_id")
          REFERENCES "feedback_reports" ("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_feedback_notes_report_id" ON "feedback_notes" ("report_id")`,
    );

    // New table: enable RLS the same run it's created in — see
    // EnableRlsOnLaterTables1780701950000, which found ten tables left
    // exposed to the anon key by skipping this step.
    await queryRunner.query(
      `ALTER TABLE "feedback_notes" ENABLE ROW LEVEL SECURITY`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "feedback_notes"`);
    await queryRunner.query(
      `ALTER TABLE "feedback_reports" DROP COLUMN IF EXISTS "assignee"`,
    );
  }
}
