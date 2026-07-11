import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, idempotent migration (BANNED-1 follow-up): server-evaluated
 * banned/restricted-substance flag on `treatments` and `disease_records`.
 *
 * The banned-substance guardrail previously only ran client-side
 * (frontend/src/features/bannedSubstances.ts) — a warning shown at log time,
 * never persisted, and trivially bypassable (an offline-stale app, a modified
 * client, or simply a farmer dismissing the alert leaves no server-side trace
 * that the check ever ran or what it found). For a compliance/export-risk
 * signal, the audit trail must be authoritative, not client-trusted.
 *
 * `banned_substance_flag` — 'none' | 'restricted' | 'banned', computed by the
 * backend at write time against its own BANNED_SUBSTANCES list
 * (backend/src/banned-substances/banned-substance-matcher.ts), independent of
 * anything the client sent. Defaults to 'none' for existing rows (never
 * evaluated) rather than nullable, so a report can safely filter
 * `WHERE banned_substance_flag != 'none'` without NULL-handling.
 *
 * `banned_substance_matches` — the matched substance names, for the record's
 * own audit trail / detail view.
 *
 * `banned_substance_list_version` — which BANNED_LIST_VERSION evaluated this
 * row, so a record flagged 'none' against an older list can be distinguished
 * from one confirmed clean against the current list (matters if the list is
 * ever tightened).
 */
export class AddBannedSubstanceFlag1780301800000
  implements MigrationInterface
{
  name = 'AddBannedSubstanceFlag1780301800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['treatments', 'disease_records']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "banned_substance_flag" text NOT NULL DEFAULT 'none'`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "banned_substance_matches" text[] NOT NULL DEFAULT '{}'`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "banned_substance_list_version" text`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['treatments', 'disease_records']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "banned_substance_list_version"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "banned_substance_matches"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "banned_substance_flag"`,
      );
    }
  }
}
