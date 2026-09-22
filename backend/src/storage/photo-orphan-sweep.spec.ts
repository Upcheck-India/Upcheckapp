import { PhotoDeletionService } from './photo-deletion.service';
import { PHOTO_REFERENCE_COLUMNS, PHOTO_SURFACES } from './photo-surfaces';

/**
 * F1 orphan cleanup — SAFETY. A fake DataSource plays the database: the
 * candidate SELECT returns every unattached ledger row (as if its SQL age
 * filter were wrong, so the service's own age check is what is tested), and
 * the reference query answers from a per-column store, but only for columns
 * the service's SQL actually asks about.
 */
const FARM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NOW = new Date('2026-09-22T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const path = (n: number) => `${FARM}/${String(n).padStart(8, '0')}-cccc-4ccc-8ccc-cccccccccccc.webp`;

function sweeper(ledger: { path: string; uploaded_at: string }[], refs: Record<string, string[]> = {}) {
  const query = jest.fn(async (q: string, p: any[] = []) => {
    if (/to_regclass/.test(q)) return [{ ok: true }];
    if (/FROM photo_objects o\s+WHERE o.record_id IS NULL/.test(q)) {
      return ledger.map((r) => ({ namespace: 'health', ...r }));
    }
    if (/FROM unnest\(\$1::text\[\]\) AS c\(p\)/.test(q)) {
      const asked = (p[0] as string[]).filter((c) =>
        Object.entries(refs).some(([col, paths]) => {
          const [table, column] = col.split('.');
          return q.includes(`FROM ${table} t WHERE t.${column}`) && (paths.includes(c) || paths.includes(`health/${c}`));
        }),
      );
      return asked.map((c) => ({ p: c }));
    }
    return [];
  });
  const svc = new PhotoDeletionService({ query, manager: { query } } as any, { configured: true } as any);
  jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
  const queued = () => {
    const insert = query.mock.calls.find(([q]) => /^INSERT INTO photo_deletions/.test(q));
    return insert ? (insert[1] as any[])[1] : [];
  };
  return { svc, query, queued };
}

describe('F1 orphan sweep — what may be deleted', () => {
  it('a 25 h-old unreferenced upload is queued as an orphan', async () => {
    const { svc, queued, query } = sweeper([{ path: path(1), uploaded_at: hoursAgo(25) }]);
    expect(await svc.sweepOrphans(100, NOW)).toBe(1);
    expect(queued()).toEqual([path(1)]);
    const insert = query.mock.calls.find(([q]) => /^INSERT INTO photo_deletions/.test(q))!;
    expect((insert[1] as any[])[2]).toBe('orphan');
  });

  it('a 23 h-old unreferenced upload is NOT selected', async () => {
    const { svc, queued } = sweeper([{ path: path(1), uploaded_at: hoursAgo(23) }]);
    expect(await svc.sweepOrphans(100, NOW)).toBe(0);
    expect(queued()).toEqual([]);
  });

  it.each(PHOTO_REFERENCE_COLUMNS.map((c) => `${c.table}.${c.column}`))(
    'a photo referenced by %s is never selected, however old',
    async (col) => {
      const { svc, queued } = sweeper(
        [
          { path: path(1), uploaded_at: hoursAgo(24 * 30) },
          { path: path(2), uploaded_at: hoursAgo(25) },
        ],
        { [col]: [path(1)] },
      );
      expect(await svc.sweepOrphans(100, NOW)).toBe(1);
      expect(queued()).toEqual([path(2)]);
    },
  );

  it('a farm photo reported in feedback (`health/<path>`) is never selected', async () => {
    const { svc, queued } = sweeper([{ path: path(1), uploaded_at: hoursAgo(48) }], {
      'feedback_reports.attachment_paths': [`health/${path(1)}`],
    });
    expect(await svc.sweepOrphans(100, NOW)).toBe(0);
    expect(queued()).toEqual([]);
  });

  it('if the reference check fails, nothing is queued', async () => {
    const { svc, query, queued } = sweeper([{ path: path(1), uploaded_at: hoursAgo(48) }]);
    const base = query.getMockImplementation()!;
    query.mockImplementation(async (q: string, p?: any[]) => {
      if (/FROM unnest/.test(q)) throw Object.assign(new Error('column "photo_paths" does not exist'), { code: '42703' });
      return base(q, p);
    });
    expect(await svc.sweepOrphans(100, NOW)).toBe(0);
    expect(queued()).toEqual([]);
  });

  it('only unattached, not-yet-queued ledger rows past the cutoff are candidates, in bounded batches', async () => {
    const { svc, query } = sweeper([]);
    await svc.sweepOrphans(50, NOW);
    const [sql, params] = query.mock.calls.find(([q]) => /FROM photo_objects o/.test(q))!;
    expect(sql).toMatch(/o.record_id IS NULL/);
    expect(sql).toMatch(/o.uploaded_at < \$1::timestamptz/);
    expect(sql).toMatch(/NOT EXISTS \(SELECT 1 FROM photo_deletions d/);
    expect(sql).toMatch(/LIMIT \$2/);
    expect(params).toEqual([hoursAgo(24), 50]);
  });

  it('the reference list covers every photo column in the codebase', () => {
    const cols = PHOTO_REFERENCE_COLUMNS.map((c) => `${c.table}.${c.column}`);
    const surfaceTables = [...new Set(Object.values(PHOTO_SURFACES).map((s) => s.table))];
    expect(cols).toEqual(
      expect.arrayContaining([
        'health_observations.photo_urls',
        'mortality_records.photo_urls',
        'disease_records.photo_urls',
        'users.avatar_path',
        'feedback_reports.attachment_paths',
        'farms.photo_paths',
        'ponds.photo_paths',
        ...surfaceTables.map((t) => `${t}.photo_paths`),
      ]),
    );
  });
});
