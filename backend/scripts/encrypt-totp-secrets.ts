/**
 * C5.3 — a MANUAL, one-off step, run by the owner after TOTP_ENCRYPTION_KEY is
 * set on Render (and again after a key rotation). See RENDER-SETUP.md.
 *
 * Seals every `users.totp_secret` that is still plaintext, or that only
 * TOTP_ENCRYPTION_KEY_PREVIOUS can open, under the current key. The app does
 * this lazily on each successful 2FA check anyway; this finishes the job for
 * users who haven't signed in since.
 *
 * One transaction; each UPDATE is a compare-and-swap on the old value, so a
 * user enabling/disabling 2FA mid-run is left alone. A row neither key opens is
 * reported and skipped, never overwritten. Idempotent: a re-run finds nothing.
 *
 * Needs the DB env of typeorm.config.ts plus TOTP_ENCRYPTION_KEY (and
 * TOTP_ENCRYPTION_KEY_PREVIOUS while rotating).
 *
 *   npx ts-node scripts/encrypt-totp-secrets.ts            # dry run: report only
 *   npx ts-node scripts/encrypt-totp-secrets.ts --apply    # write
 */
import dataSource from '../typeorm.config';
import { isSealed, openTotpSecret, sealTotpSecret, totpKeyState } from '../src/auth/totp-secret-cipher';

const APPLY = process.argv.includes('--apply');

async function main() {
  if (totpKeyState() !== 'ok') {
    throw new Error('TOTP_ENCRYPTION_KEY must be set to 32 bytes of base64 (openssl rand -base64 32)');
  }
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (m) => {
      const rows: { id: string; totp_secret: string }[] = await m.query(
        `SELECT id, totp_secret FROM users WHERE totp_secret IS NOT NULL`,
      );
      let plaintext = 0;
      let rotated = 0;
      let current = 0;
      const unreadable: string[] = [];
      for (const r of rows) {
        const { secret, stale } = openTotpSecret(r.totp_secret);
        if (secret === null) {
          unreadable.push(r.id);
          continue;
        }
        if (!stale) {
          current++;
          continue;
        }
        if (isSealed(r.totp_secret)) rotated++;
        else plaintext++;
        if (APPLY) {
          await m.query(`UPDATE users SET totp_secret = $1 WHERE id = $2 AND totp_secret = $3`, [
            sealTotpSecret(secret),
            r.id,
            r.totp_secret,
          ]);
        }
      }
      console.log(`${rows.length} users with a TOTP secret:`);
      console.log(`  ${current} already sealed under the current key`);
      console.log(`  ${plaintext} plaintext ${APPLY ? 'sealed' : 'to seal'}`);
      console.log(`  ${rotated} under the previous key ${APPLY ? 're-sealed' : 'to re-seal'}`);
      if (unreadable.length) {
        console.log(`  ${unreadable.length} UNREADABLE with either key (left untouched): ${unreadable.join(', ')}`);
      }
      if (!APPLY) console.log('\nDry run — nothing written. Re-run with --apply.');
    });
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
