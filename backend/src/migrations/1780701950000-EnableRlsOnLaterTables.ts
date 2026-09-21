import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-runs EnableRowLevelSecurity1780301300000's block. That migration told
 * every later table to enable RLS itself; ten did not (attendance_records,
 * leave_requests, farm_invites, farm_member_ponds, task_assignees, the news
 * and disease translation tables, migrations_lock), which left them readable
 * AND writable by the anon key embedded in the app. Found 2026-09-21.
 *
 * Also covers photo_deletions (1780701900000). No policies are added: the
 * backend connects as the table owner and bypasses RLS, and the app uses the
 * anon key for auth only, so this changes no app behaviour.
 *
 * Idempotent. Any NEW table must still enable RLS in its own migration.
 */
export class EnableRlsOnLaterTables1780701950000 implements MigrationInterface {
  name = 'EnableRlsOnLaterTables1780701950000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DO $$
            DECLARE r RECORD;
            BEGIN
                FOR r IN
                    SELECT tablename FROM pg_tables
                    WHERE schemaname = 'public' AND tablename <> 'migrations' AND NOT rowsecurity
                LOOP
                    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
                END LOOP;
            END $$;
        `);
  }

  public async down(): Promise<void> {
    // Deliberately a no-op: re-exposing these tables to the anon key is never the rollback we want.
  }
}
