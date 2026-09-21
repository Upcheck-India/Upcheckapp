import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  R2StorageService,
  photoError,
  type UploadedImage,
} from '../storage/r2-storage.service';
import { PhotoDeletionService } from '../storage/photo-deletion.service';

/** What a viewer gets for one person: both null when hidden or unset. */
export interface AvatarUrls {
  avatarUrl: string | null;
  avatarThumbUrl: string | null;
}

export interface MyAvatar extends AvatarUrls {
  /** True when the picture is one the user uploaded (can be removed). */
  hasUploadedAvatar: boolean;
  showAvatarToTeam: boolean;
}

const NONE: AvatarUrls = { avatarUrl: null, avatarThumbUrl: null };
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Postgres undefined_column: migration 1780701800000 not applied yet. */
const isMissingColumn = (err: any) =>
  (err?.code ?? err?.driverError?.code) === '42703';

const NOT_MIGRATED =
  'Profile photos are not available yet — the server needs a database update.';

interface Row {
  id: string;
  avatar_url: string | null;
  avatar_path: string | null;
  show_avatar_to_team: boolean | null;
}

/**
 * Profile pictures (R2 `avatars/<userId>/<uuid>.webp` + thumbnail).
 *
 * The DB holds the PATH (users.avatar_path), never a URL. An uploaded picture
 * wins over the provider's `avatar_url`, which the auth trigger keeps
 * rewriting on login and which this service therefore never writes.
 *
 * Who sees a picture — whatever its source — is decided here, server side:
 * the user themselves, plus people who share a live farm with them, and the
 * latter only while `show_avatar_to_team` is on. Never public.
 */
@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);

  constructor(
    private readonly db: DataSource,
    private readonly storage: R2StorageService,
    private readonly deletions: PhotoDeletionService,
  ) {}

  /** A stored avatar path must sit in that user's own folder. */
  ownsPath(userId: string, path: string | null | undefined): path is string {
    return (
      !!path &&
      new RegExp(`^${userId}/${UUID}(\\.thumb)?\\.(webp|jpg|png|heic)$`).test(path)
    );
  }

  /**
   * Avatars `viewerId` may see for `userIds`, among farms `farmIds` (the
   * caller's already-authorised scope; re-checked here: the viewer must be an
   * active member or owner of the farm, and so must the person). One query
   * and one local signing pass per list, never per row. Never throws.
   */
  async resolve(
    viewerId: string,
    farmIds: string[],
    userIds: string[],
  ): Promise<Map<string, AvatarUrls>> {
    const ids = [...new Set(userIds.filter(Boolean))];
    const out = new Map<string, AvatarUrls>(ids.map((id) => [id, NONE]));
    if (!ids.length) return out;

    const sharesFarm = (show: string) => `
      u.id = $1 OR (${show} AND EXISTS (
        SELECT 1 FROM farms f
         WHERE f.id = ANY($3::uuid[]) AND f.deleted_at IS NULL
           AND (f.user_id = $1 OR EXISTS (SELECT 1 FROM farm_members vm
                 WHERE vm.farm_id = f.id AND vm.user_id = $1 AND vm.status = 'active'))
           AND (f.user_id = u.id OR EXISTS (SELECT 1 FROM farm_members um
                 WHERE um.farm_id = f.id AND um.user_id = u.id AND um.status = 'active'))))`;
    const params = [viewerId, ids, farmIds];
    let rows: Row[];
    try {
      rows = await this.db.query(
        `SELECT u.id, u.avatar_url, u.avatar_path, u.show_avatar_to_team
           FROM users u WHERE u.id = ANY($2::uuid[]) AND (${sharesFarm('u.show_avatar_to_team')})`,
        params,
      );
    } catch (err) {
      try {
        if (!isMissingColumn(err)) throw err;
        // Not migrated: no uploads exist and the setting is its default (on).
        rows = await this.db.query(
          `SELECT u.id, u.avatar_url, NULL AS avatar_path, true AS show_avatar_to_team
             FROM users u WHERE u.id = ANY($2::uuid[]) AND (${sharesFarm('true')})`,
          params,
        );
      } catch (e: any) {
        this.logger.warn(`Could not resolve avatars: ${e?.message ?? e}`);
        return out;
      }
    }
    for (const [id, urls] of await this.urlsFor(rows)) out.set(id, urls);
    return out;
  }

  /** The caller's own picture and setting (always visible to themselves). */
  async mine(userId: string): Promise<MyAvatar> {
    const row = await this.readOwn(userId).catch((err) => {
      if (!isMissingColumn(err)) throw err;
      return this.db
        .query(`SELECT id, avatar_url, NULL AS avatar_path, true AS show_avatar_to_team FROM users WHERE id = $1`, [userId])
        .then((r: Row[]) => r[0]);
    });
    if (!row) return { ...NONE, hasUploadedAvatar: false, showAvatarToTeam: true };
    const urls = (await this.urlsFor([row])).get(userId) ?? NONE;
    return {
      ...urls,
      hasUploadedAvatar: this.ownsPath(userId, row.avatar_path),
      showAvatarToTeam: row.show_avatar_to_team !== false,
    };
  }

  /**
   * Store a new picture, point the user at it, then delete the old one.
   * Order matters: the DB never points at a deleted object.
   */
  async upload(userId: string, file: UploadedImage): Promise<MyAvatar> {
    // Before touching R2: an unmigrated DB must not leave an orphan upload.
    const old = await this.currentPath(userId);
    const path = await this.storage.putImage('avatars', `${userId}/${randomUUID()}`, file);
    // Conditional on the path we read, so two racing uploads cannot both win
    // and leave one picture unreferenced-but-kept.
    const updated: unknown[] = await this.db.query(
      `UPDATE users SET avatar_path = $2 WHERE id = $1 AND avatar_path IS NOT DISTINCT FROM $3 RETURNING id`,
      [userId, path, old],
    );
    if (!updatedRows(updated)) {
      await this.deleteOwn(userId, path);
      throw new ConflictException('Your photo changed in the meantime — try again.');
    }
    if (old) await this.deleteOwn(userId, old);
    return this.mine(userId);
  }

  /** Clear the DB reference first, then delete both R2 objects. */
  async remove(userId: string): Promise<MyAvatar> {
    const old = await this.currentPath(userId);
    if (old) {
      await this.db.query(
        `UPDATE users SET avatar_path = NULL WHERE id = $1 AND avatar_path = $2`,
        [userId, old],
      );
      await this.deleteOwn(userId, old);
    }
    return this.mine(userId);
  }

  async setVisibility(userId: string, show: boolean): Promise<MyAvatar> {
    try {
      await this.db.query(`UPDATE users SET show_avatar_to_team = $2 WHERE id = $1`, [userId, show]);
    } catch (err) {
      if (isMissingColumn(err)) throw new ServiceUnavailableException(photoError(503, 'AVATAR_NOT_MIGRATED', NOT_MIGRATED));
      throw err;
    }
    return this.mine(userId);
  }

  /**
   * Account deletion: every object under `avatars/<userId>/`, including any
   * a failed delete left behind. Throws if R2 refuses, so deletion can be
   * retried rather than silently leaving photos behind.
   */
  async purgeUser(userId: string): Promise<void> {
    if (!this.storage.configured) {
      this.logger.warn(`R2 not configured; no avatar objects to purge for ${userId}`);
      return;
    }
    if (!new RegExp(`^${UUID}$`).test(userId)) return;
    await this.storage.deletePrefix('avatars', `${userId}/`);
  }

  // ─────────────────────────────── helpers ───────────────────────────────

  private async readOwn(userId: string): Promise<Row | undefined> {
    const rows: Row[] = await this.db.query(
      `SELECT id, avatar_url, avatar_path, show_avatar_to_team FROM users WHERE id = $1`,
      [userId],
    );
    return rows[0];
  }

  private async currentPath(userId: string): Promise<string | null> {
    try {
      return (await this.readOwn(userId))?.avatar_path ?? null;
    } catch (err) {
      if (isMissingColumn(err)) throw new ServiceUnavailableException(photoError(503, 'AVATAR_NOT_MIGRATED', NOT_MIGRATED));
      throw err;
    }
  }

  /** Uploaded (signed, 1h) beats provider URL; batch-signed in one pass. */
  private async urlsFor(rows: Row[]): Promise<Map<string, AvatarUrls>> {
    const out = new Map<string, AvatarUrls>();
    const own = rows.filter((r) => this.ownsPath(r.id, r.avatar_path));
    const { full, thumb } = await this.storage.sign(
      'avatars',
      own.map((r) => r.avatar_path!),
    );
    own.forEach((r, i) => {
      if (full[i]) out.set(r.id, { avatarUrl: full[i], avatarThumbUrl: thumb[i] ?? full[i] });
    });
    for (const r of rows) {
      if (out.has(r.id)) continue;
      const ext = /^https:\/\//.test(r.avatar_url ?? '') ? r.avatar_url : null;
      out.set(r.id, { avatarUrl: ext, avatarThumbUrl: ext });
    }
    return out;
  }

  /**
   * F1: queue one of the user's pictures (+ thumbnail) for R2 deletion. The
   * queue retries durably; a failed enqueue is logged with the key, never
   * thrown — the new picture is already saved.
   */
  private async deleteOwn(userId: string, path: string): Promise<void> {
    if (!this.ownsPath(userId, path)) {
      this.logger.error(`Refusing to delete avatar path outside ${userId}/: ${path}`);
      return;
    }
    await this.deletions
      .enqueue([{ namespace: 'avatars', path }], 'photo_removed', userId)
      .catch((err: any) =>
        this.logger.error(`Could not queue old avatar avatars/${path}: ${err?.message ?? err}`),
      );
  }
}

/** node-postgres UPDATE … RETURNING via TypeORM: [rows, count] or rows. */
function updatedRows(result: unknown): number {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0].length;
  return Array.isArray(result) ? result.length : 0;
}
