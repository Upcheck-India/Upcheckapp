import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Uploaded profile pictures + who may see them.
 *
 * - `avatar_path`: R2 path (`<userId>/<uuid>.webp`, under `avatars/`) of a
 *   picture the user uploaded. Separate from `avatar_url` on purpose: the
 *   `handle_new_user` trigger (supabase_setup.sql) rewrites `avatar_url` from
 *   the Google/Truecaller metadata on every auth.users update, i.e. every
 *   login, which would silently replace an uploaded picture.
 * - `show_avatar_to_team`: whether farm-mates see the picture (default on).
 *   Off = only the user themselves, whatever the picture's source.
 *
 * Additive and idempotent. NOT User entity columns: read and written with raw
 * SQL that tolerates 42703 (AvatarService), so an unapplied migration never
 * breaks a users read. Apply before the backend deploy all the same.
 */
export class UserAvatarPathAndVisibility1780701800000 implements MigrationInterface {
  name = 'UserAvatarPathAndVisibility1780701800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_path" varchar(200) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "show_avatar_to_team" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "show_avatar_to_team"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_path"`);
  }
}
