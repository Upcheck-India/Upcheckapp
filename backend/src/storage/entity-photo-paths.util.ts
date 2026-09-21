import type { EntityManager } from 'typeorm';

const isMissingSchema = (err: any) =>
  ['42P01', '42703'].includes(err?.code ?? err?.driverError?.code);

/**
 * F5: `photo_paths text[]` on an entity table, added in migration
 * 1780702800000 but not necessarily applied yet. Every read/write goes
 * through these two guards so an unmigrated column degrades to "no photos"
 * instead of a 500 on every read of that table (AGENTS.md fail-safe pattern).
 */
export async function readPhotoPaths(
  m: EntityManager,
  table: string,
  id: string,
): Promise<string[]> {
  try {
    const [row] = await m.query(
      `SELECT photo_paths FROM ${table} WHERE id = $1`,
      [id],
    );
    return row?.photo_paths ?? [];
  } catch (err) {
    if (isMissingSchema(err)) return [];
    throw err;
  }
}

/** Returns false (logged by the caller) when the column isn't migrated yet. */
export async function writePhotoPaths(
  m: EntityManager,
  table: string,
  id: string,
  paths: string[] | null | undefined,
): Promise<boolean> {
  try {
    await m.query(`UPDATE ${table} SET photo_paths = $2 WHERE id = $1`, [
      id,
      paths?.length ? paths : null,
    ]);
    return true;
  } catch (err) {
    if (isMissingSchema(err)) return false;
    throw err;
  }
}
