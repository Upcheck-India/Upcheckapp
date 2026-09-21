import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * F5 (photos spec 2026-09-20): additive `photo_paths text[]` on every new
 * surface, plus `users.photo_terms_ack_at` for F8.1's first-upload
 * acknowledgement. No new tables, so no RLS to enable.
 *
 * Every reader/writer of these columns MUST go through the
 * `readPhotoPaths`/`writePhotoPaths` guard in
 * `storage/entity-photo-paths.util.ts` (42703 -> behave as no photos), and
 * `photo_terms_ack_at` MUST stay out of `PUBLIC_USER_SELECT` / any default
 * `users` select — read it only via the guarded query in
 * `users/photo-terms-ack.service.ts`. Not applied by this change; apply
 * before the backend that reads it deploys.
 */
export class PhotoSurfaces1780702800000 implements MigrationInterface {
  name = 'PhotoSurfaces1780702800000';

  private readonly tables = [
    'expenses', // receipt / bill (cap 2)
    'transactions', // receipt / bill (cap 2)
    'harvests', // buyer's weighing slip (cap 2, protected 12mo)
    'treatments', // input label + batch (cap 2)
    'feed_records', // input label + batch (cap 2)
    'inventory', // input label + batch (cap 2)
    'crops', // seed PCR certificate (cap 2, protected)
    'ponds', // identity photo (cap 1, replaces)
    'farms', // identity photo (cap 1, replaces)
    'water_quality_records', // water colour (cap 1)
    'feeding_tray_checks', // tray (cap 1)
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "photo_paths" text[] NULL`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "photo_terms_ack_at" timestamptz NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "photo_paths"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "photo_terms_ack_at"`,
    );
  }
}
