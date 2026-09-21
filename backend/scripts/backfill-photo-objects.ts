/**
 * F2 backfill (photos spec 2026-09-20 §5 step 3) — a MANUAL, one-off step.
 *
 * Puts every photo stored before the `photo_objects` ledger existed into it,
 * so the storage screen's usage stops reading low (it says "incomplete" until
 * this has run). Paths come from the DB (health/mortality/disease photo
 * arrays, avatars, feedback attachments); byte sizes from an R2 HeadObject of
 * the full image and its thumbnail. Owner = the farm owner for farm photos,
 * the user for avatars and feedback — same rule as a new upload.
 *
 * Idempotent: only paths with no ledger row are considered, and the insert is
 * ON CONFLICT DO NOTHING, so a re-run (or a run racing live uploads) is safe.
 * A path whose object is missing in R2 is reported and skipped, never guessed.
 *
 * Needs the 1780702000000 migration applied, the DB env of typeorm.config.ts
 * and R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (/ R2_BUCKET).
 *
 *   npx ts-node scripts/backfill-photo-objects.ts            # dry run: report only
 *   npx ts-node scripts/backfill-photo-objects.ts --apply    # write ledger rows
 */
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import dataSource from '../typeorm.config';

const APPLY = process.argv.includes('--apply');
const FILE_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/;
const thumbPathOf = (p: string) => (p.endsWith('.webp') ? p.replace(/\.webp$/, '.thumb.webp') : p);

interface Candidate {
  path: string;
  namespace: 'health' | 'avatars' | 'feedback';
  owner_user_id: string;
  farm_id: string | null;
  pond_id: string | null;
  crop_id: string | null;
  entity: string;
  record_id: string;
  uploaded_by: string;
  uploaded_at: Date;
}

/** Every referenced photo with no ledger row yet; first (oldest) reference wins. */
const CANDIDATES_SQL = `
SELECT DISTINCT ON (x.path) x.* FROM (
  SELECT unnest(h.photo_urls) AS path, 'health' AS namespace, f.user_id AS owner_user_id,
         po.farm_id, h.pond_id, h.crop_id, 'health_observation' AS entity, h.id AS record_id,
         COALESCE(h.created_by, f.user_id) AS uploaded_by, h.created_at AS uploaded_at
  FROM health_observations h JOIN ponds po ON po.id = h.pond_id JOIN farms f ON f.id = po.farm_id
  UNION ALL
  SELECT unnest(r.photo_urls), 'health', f.user_id, po.farm_id, c.pond_id, r.crop_id, 'mortality', r.id,
         COALESCE(r.created_by_id, f.user_id), r.created_at
  FROM mortality_records r JOIN crops c ON c.id = r.crop_id JOIN ponds po ON po.id = c.pond_id JOIN farms f ON f.id = po.farm_id
  UNION ALL
  SELECT unnest(r.photo_urls), 'health', f.user_id, po.farm_id, c.pond_id, r.crop_id, 'disease', r.id,
         COALESCE(r.created_by_id, f.user_id), r.created_at
  FROM disease_records r JOIN crops c ON c.id = r.crop_id JOIN ponds po ON po.id = c.pond_id JOIN farms f ON f.id = po.farm_id
  UNION ALL
  SELECT u.avatar_path, 'avatars', u.id, NULL, NULL, NULL, 'avatar', u.id, u.id, now()
  FROM users u WHERE u.avatar_path IS NOT NULL
  UNION ALL
  SELECT jsonb_array_elements_text(fr.attachment_paths), 'feedback', fr.user_id, NULL, NULL, NULL, 'feedback', fr.id,
         fr.user_id, fr.created_at
  FROM feedback_reports fr
) x
WHERE x.path IS NOT NULL AND NOT EXISTS (SELECT 1 FROM photo_objects o WHERE o.path = x.path)
ORDER BY x.path, x.uploaded_at`;

async function main() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are required');
  }
  const bucket = process.env.R2_BUCKET || 'upcheck-photos';
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  /** Object size in bytes, or null when it does not exist. */
  const size = async (key: string): Promise<number | null> => {
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return head.ContentLength ?? 0;
    } catch (err: any) {
      if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  };

  await dataSource.initialize();
  try {
    const rows: Candidate[] = await dataSource.query(CANDIDATES_SQL);
    console.log(`${rows.length} photo path(s) without a ledger row. ${APPLY ? 'APPLYING.' : 'Dry run (pass --apply to write).'}`);
    let written = 0;
    let missing = 0;
    let malformed = 0;
    let bytes = 0;
    // ponytail: sequential HEADs — fine for a one-off over a few thousand photos.
    for (const r of rows) {
      if (!FILE_RE.test(r.path)) {
        malformed++;
        console.warn(`skip malformed ${r.namespace}/${r.path}`);
        continue;
      }
      const full = await size(`${r.namespace}/${r.path}`);
      if (full === null) {
        missing++;
        console.warn(`skip missing in R2: ${r.namespace}/${r.path} (${r.entity} ${r.record_id})`);
        continue;
      }
      const thumbPath = thumbPathOf(r.path);
      const thumb = thumbPath === r.path ? 0 : ((await size(`${r.namespace}/${thumbPath}`)) ?? 0);
      bytes += full + thumb;
      if (APPLY) {
        await dataSource.query(
          `INSERT INTO photo_objects
             (path, namespace, owner_user_id, farm_id, pond_id, crop_id, entity, record_id,
              bytes_full, bytes_thumb, uploaded_by, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (path) DO NOTHING`,
          [r.path, r.namespace, r.owner_user_id, r.farm_id, r.pond_id, r.crop_id, r.entity, r.record_id,
           full, thumb, r.uploaded_by, r.uploaded_at],
        );
      }
      written++;
    }
    console.log(
      `${APPLY ? 'Wrote' : 'Would write'} ${written} row(s), ${(bytes / 1024 / 1024).toFixed(1)} MB; ` +
        `${missing} missing in R2, ${malformed} malformed.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
