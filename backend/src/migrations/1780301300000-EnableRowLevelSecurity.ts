import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Defense-in-depth (blueprint §30): enable ROW LEVEL SECURITY on every public
 * table so the Supabase anon/authenticated roles (which reach the DB only via
 * PostgREST) get NO table access by default — there are no permissive policies.
 *
 * Server-side access is unaffected:
 *   - the NestJS backend connects as the table OWNER (DATABASE_URL / postgres
 *     role), which bypasses RLS;
 *   - the auth-sync trigger handle_new_user() is SECURITY DEFINER, so it runs as
 *     its owner and bypasses RLS too.
 * The mobile client uses the anon key for AUTH ONLY (all data flows through the
 * backend), so locking the anon role out of every table closes the direct-access
 * hole without changing any app behaviour. This also satisfies the SEC-1 launch
 * gate at the database layer.
 *
 * Runs after all table-creation migrations. NOTE: any NEW table added by a later
 * migration must enable RLS itself (or re-run this dynamic block).
 */
export class EnableRowLevelSecurity1780301300000 implements MigrationInterface {
  name = 'EnableRowLevelSecurity1780301300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DO $$
            DECLARE r RECORD;
            BEGIN
                FOR r IN
                    SELECT tablename FROM pg_tables
                    WHERE schemaname = 'public' AND tablename <> 'migrations'
                LOOP
                    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
                END LOOP;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DO $$
            DECLARE r RECORD;
            BEGIN
                FOR r IN
                    SELECT tablename FROM pg_tables
                    WHERE schemaname = 'public' AND tablename <> 'migrations'
                LOOP
                    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
                END LOOP;
            END $$;
        `);
  }
}
