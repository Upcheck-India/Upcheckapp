import { Logger } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { HealthPhotoStorageService } from './health-photo-storage.service';

/**
 * P2: which photo paths an edit drops from a saved record, plus a tombstone
 * line for the record's own free-text field, so removing a photo is never a
 * silent gap. Deletes nothing: the caller saves the record, THEN calls
 * `enqueueRemovedPhotos` — the other order could queue the deletion of a
 * photo the record still points at if the save failed.
 *
 * ponytail: the spec scopes the tombstone to photos already exported into a
 * D4 cycle input record; that record is generated on demand from live rows,
 * not persisted, so there is nothing to check "already exported" against.
 * Always leaving the tombstone is the safe simplification — never a silent
 * gap, at the cost of one extra line on records a buyer never saw.
 */
export async function removedPhotoTombstone(
  manager: EntityManager,
  current: string[] | null | undefined,
  next: string[] | undefined,
  userId: string | undefined,
): Promise<{ removed: string[]; tombstone: string | null }> {
  if (next === undefined) return { removed: [], tombstone: null };
  const removed = (current ?? []).filter((p) => !next.includes(p));
  if (!removed.length) return { removed, tombstone: null };

  let name = 'a team member';
  if (userId) {
    const [row] = await manager.query(
      `SELECT first_name, last_name, username FROM users WHERE id = $1`,
      [userId],
    );
    if (row) {
      name = [row.first_name, row.last_name].filter(Boolean).join(' ') || row.username || name;
    }
  }
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return {
    removed,
    tombstone: `${removed.length} photo${removed.length > 1 ? 's' : ''} removed by ${name} on ${date}`,
  };
}

/**
 * F1: queue the dropped photos after the record saved. Logged, not thrown —
 * the edit has already committed, and failing it now would only confuse.
 * ponytail: not in the save's transaction (the repos' plain `update` is
 * kept); a failed enqueue here leaves an orphan, logged with its keys.
 */
export async function enqueueRemovedPhotos(
  photos: HealthPhotoStorageService,
  logger: Logger,
  removed: string[],
  userId: string | undefined,
): Promise<void> {
  if (!removed.length) return;
  await photos
    .remove(removed, 'photo_removed', userId)
    .catch((err: any) =>
      logger.error(`Could not queue removed photo(s) ${removed.join(', ')}: ${err?.message ?? err}`),
    );
}
