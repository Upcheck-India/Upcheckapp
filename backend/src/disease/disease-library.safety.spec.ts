import { DISEASE_SEED_DATA } from './disease.service';
import { findBannedSubstances } from '../banned-substances/banned-substance-matcher';
import { AddDiseaseLibraryTranslations1780301900000 } from '../migrations/1780301900000-AddDiseaseLibraryTranslations';
import { SeedDiseaseLibrary1746000000000 } from '../migrations/1746000000000-SeedDiseaseLibrary';
import {
  RemoveAntibioticAdvice1780701300000,
  VIBRIO_TREATMENT_FIX,
} from '../migrations/1780701300000-RemoveAntibioticAdvice';

/**
 * Spec 2026-09-19 D0/S3: the disease library must never recommend an
 * antibiotic or name a banned/restricted substance — in any of the 6 locales,
 * as seeded in code AND as the migrations leave the database.
 */

// "antibiotic" in en + the 5 seeded translations' words for it.
const ANTIBIOTIC =
  /antibiotic|एंटीबायोटिक|நுண்ணுயிர் எதிர்ப்பி|యాంటీబయాటిక్|অ্যান্টিবায়োটিক|ଆଣ୍ଟିବାୟୋଟିକ/i;

const recordingRunner = () => {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  return {
    calls,
    runner: {
      query: jest.fn(async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
      }),
    } as any,
  };
};

const sameArray = (a: unknown, b: string[]) =>
  Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);

/** Translation rows as 1780301900000 inserts them, after 1780701300000's fix. */
async function effectiveTranslations(): Promise<string[][]> {
  const { calls, runner } = recordingRunner();
  await new AddDiseaseLibraryTranslations1780301900000().up(runner);
  const inserts = calls.filter((c) => c.params && c.params.length === 5);
  expect(inserts.length).toBeGreaterThan(0);
  return inserts.map(({ params }) => {
    const [, locale, symptoms, prevention, treatment] = params as [
      string,
      string,
      string[],
      string[],
      string[],
    ];
    const fix = VIBRIO_TREATMENT_FIX.find(
      (f) => f.locale === locale && sameArray(treatment, f.from),
    );
    return [...symptoms, ...prevention, ...(fix ? fix.to : treatment)];
  });
}

const assertSafe = (texts: string[]) => {
  for (const text of texts) {
    expect({ text, antibiotic: ANTIBIOTIC.test(text) }).toEqual({
      text,
      antibiotic: false,
    });
    expect({ text, banned: findBannedSubstances(text).map((s) => s.name) })
      .toEqual({ text, banned: [] });
  }
};

describe('Disease library text safety (S3)', () => {
  it('the code seed never recommends antibiotics or a listed substance', () => {
    const texts = DISEASE_SEED_DATA.flatMap((d) => [
      d.name,
      d.scientificName ?? '',
      ...(d.commonNames ?? []),
      ...(d.symptoms ?? []),
      ...(d.preventionMeasures ?? []),
      ...(d.treatmentRecommendations ?? []),
    ]);
    assertSafe(texts);
  });

  it('every translation, as the migrations leave it, is safe in all 5 locales', async () => {
    const rows = await effectiveTranslations();
    assertSafe(rows.flat());
  });

  it('the fix covers every locale and its replacement text is safe', () => {
    expect(VIBRIO_TREATMENT_FIX.map((f) => f.locale).sort()).toEqual(
      ['bn', 'en', 'hi', 'or', 'ta', 'te'],
    );
    for (const f of VIBRIO_TREATMENT_FIX) {
      expect(f.from.some((s) => ANTIBIOTIC.test(s))).toBe(true);
      assertSafe(f.to);
    }
  });

  it('the English fix matches what the original seed migration inserted', async () => {
    const { calls, runner } = recordingRunner();
    await new SeedDiseaseLibrary1746000000000().up(runner);
    const en = VIBRIO_TREATMENT_FIX.find((f) => f.locale === 'en')!;
    const literal = `ARRAY[${en.from.map((s) => `'${s}'`).join(',')}]`;
    expect(calls.some((c) => c.sql.includes(literal))).toBe(true);
  });

  it('the migration only rewrites rows still equal to the seeded text', async () => {
    const { calls, runner } = recordingRunner();
    await new RemoveAntibioticAdvice1780701300000().up(runner);
    const updates = calls.filter((c) => /^\s*UPDATE/.test(c.sql));
    expect(updates).toHaveLength(6);
    for (const u of updates) {
      expect(u.sql).toMatch(/"treatment_recommendations" = \$\d+::text\[\]\s*$/);
    }
    // H5: the FK is recreated as RESTRICT.
    expect(calls.some((c) => /ON DELETE RESTRICT/.test(c.sql))).toBe(true);
  });
});
