import { Logger } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { HealthPhotoStorageService } from './health-photo-storage.service';

/**
 * P2: when an edit drops a photo path from a saved record, delete the
 * object(s) directly (F1's deletion queue doesn't exist yet — logged, not
 * thrown, so a storage hiccup never blocks saving the record) and return a
 * tombstone line for the record's own free-text field, so removing a photo
 * is never a silent gap.
 * // F1: once `photo_deletions` ships, enqueue instead of deleting inline.
 *
 * ponytail: the spec scopes the tombstone to photos already exported into a
 * D4 cycle input record; that record is generated on demand from live rows,
 * not persisted, so there is nothing to check "already exported" against.
 * Always leaving the tombstone is the safe simplification — never a silent
 * gap, at the cost of one extra line on records a buyer never saw.
 */
export async function removedPhotoTombstone(
  manager: EntityManager,
  photos: HealthPhotoStorageService,
  logger: Logger,
  current: string[] | null | undefined,
  next: string[] | undefined,
  userId: string | undefined,
): Promise<string | null> {
  if (next === undefined) return null;
  const removed = (current ?? []).filter((p) => !next.includes(p));
  if (!removed.length) return null;

  await photos
    .remove(removed)
    .catch((err: any) =>
      logger.warn(`Could not delete removed photo(s) ${removed.join(', ')}: ${err?.message ?? err}`),
    );

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
  return `${removed.length} photo${removed.length > 1 ? 's' : ''} removed by ${name} on ${date}`;
}
