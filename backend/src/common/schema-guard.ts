import { DataSource } from 'typeorm';

/**
 * Startup schema guard (migration-safety net).
 *
 * On boot, assert that the database actually has the core tables. If the
 * migration chain was never applied (e.g. a freshly-linked Supabase project
 * whose migrations did not run), this fails fast with a loud, unambiguous log
 * instead of letting the app limp into per-request "relation does not exist"
 * errors that are hard to diagnose.
 *
 * Migrations themselves run via the deploy `startCommand` (`npm run
 * migration:run`); this guard only verifies the result.
 */
const SENTINEL_TABLES = ['users', 'farms', 'farm_members', 'ponds', 'crops'];

export async function assertSchemaReady(dataSource: DataSource): Promise<void> {
  let rows: Array<{ table_name: string }>;
  try {
    rows = await dataSource.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [SENTINEL_TABLES],
    );
  } catch (err) {
    console.error('───────────────────────────────────────────────────────────');
    console.error('FATAL: schema guard could not query the database.');
    console.error('Cannot verify the schema — check DATABASE_URL and connectivity.');
    console.error((err as Error).message);
    console.error('───────────────────────────────────────────────────────────');
    throw err;
  }

  const found = new Set(rows.map((r) => r.table_name));
  const missing = SENTINEL_TABLES.filter((t) => !found.has(t));

  if (missing.length > 0) {
    console.error('───────────────────────────────────────────────────────────');
    console.error('FATAL: database schema is missing core tables:');
    console.error(`       ${missing.join(', ')}`);
    console.error('The TypeORM migration chain has not been applied to this DB.');
    console.error('Fix: run `npm run migration:run` against DATABASE_URL, then redeploy.');
    console.error('(On Render this runs automatically via the startCommand.)');
    console.error('───────────────────────────────────────────────────────────');
    throw new Error(
      `Schema not ready — missing core tables: ${missing.join(', ')}`,
    );
  }

  console.log(
    `Schema guard OK — ${SENTINEL_TABLES.length} core tables present.`,
  );
}
