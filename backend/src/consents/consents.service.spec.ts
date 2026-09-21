import { readFileSync } from 'fs';
import { join } from 'path';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConsentsService } from './consents.service';
import { RecordConsentsDto } from './dto/record-consents.dto';

const row = (over: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'terms',
  granted: true,
  docVersion: '2026-09-21',
  locale: 'ta',
  source: 'signup',
  ...over,
});

const make = (impl: (sql: string, p?: unknown[]) => any) => {
  const query = jest.fn(async (sql: string, p?: unknown[]) => impl(sql, p));
  return { svc: new ConsentsService({ query } as any), query };
};

const missing = () => {
  throw Object.assign(new Error('relation "user_consents" does not exist'), { code: '42P01' });
};

describe('ConsentsService.record', () => {
  it('appends with insert-or-ignore on the client id — never an UPDATE', async () => {
    const { svc, query } = make(() => []);
    await svc.record('u1', [row() as any, row({ id: '22222222-2222-4222-8222-222222222222', kind: 'privacy' }) as any]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO user_consents/);
    expect(sql).toMatch(/ON CONFLICT \(id\) DO NOTHING/);
    expect(sql).not.toMatch(/UPDATE/i);
    // user id comes from the caller, version + locale travel with each row
    expect(params).toEqual([
      '11111111-1111-4111-8111-111111111111', 'u1', 'terms', true, '2026-09-21', 'ta', 'signup',
      '22222222-2222-4222-8222-222222222222', 'u1', 'privacy', true, '2026-09-21', 'ta', 'signup',
    ]);
  });

  it('accepts and no-ops when the table is not migrated (42P01), never 500s', async () => {
    const { svc } = make(missing);
    await expect(svc.record('u1', [row() as any])).resolves.toEqual({ recorded: 0 });
  });

  it('rethrows any other database error', async () => {
    const { svc } = make(() => {
      throw Object.assign(new Error('boom'), { code: '23502' });
    });
    await expect(svc.record('u1', [row() as any])).rejects.toThrow('boom');
  });
});

describe('ConsentsService.latestForUser', () => {
  it('returns the latest row per kind — a withdrawal after a grant reads as withdrawn', async () => {
    const { svc } = make(() => [
      { kind: 'analytics', granted: true, doc_version: 'v1', locale: 'en', source: 'signup', created_at: new Date(1) },
      { kind: 'terms', granted: true, doc_version: 'v1', locale: 'en', source: 'signup', created_at: new Date(2) },
      { kind: 'analytics', granted: false, doc_version: 'v1', locale: 'en', source: 'settings', created_at: new Date(3) },
    ]);
    const latest = await svc.latestForUser('u1');
    expect(latest.find((r) => r.kind === 'analytics')).toMatchObject({ granted: false, source: 'settings' });
    expect(latest.find((r) => r.kind === 'terms')).toMatchObject({ granted: true });
    expect(latest).toHaveLength(2);
  });

  it('is empty, not a 500, when unmigrated', async () => {
    const { svc } = make(missing);
    await expect(svc.latestForUser('u1')).resolves.toEqual([]);
  });
});

describe('ConsentsService.usersWithCurrentTrainingConsent', () => {
  // Chronological, as the query orders them.
  const rows = [
    { user_id: 'granted', granted: true },
    { user_id: 'withdrew', granted: true },
    { user_id: 'withdrew', granted: false },
    { user_id: 'declined', granted: false },
    { user_id: 'regranted', granted: false },
    { user_id: 'regranted', granted: true },
  ];

  it('returns only users whose LATEST row is granted', async () => {
    const { svc, query } = make(() => rows);
    const users = await svc.usersWithCurrentTrainingConsent('records');
    expect(users.sort()).toEqual(['granted', 'regranted']);
    expect(query.mock.calls[0][1]).toEqual(['ml_training_records']);
  });

  it('returns nothing for a user whose latest row is false', async () => {
    const { svc } = make(() => [
      { user_id: 'u1', granted: true },
      { user_id: 'u1', granted: false },
    ]);
    expect(await svc.usersWithCurrentTrainingConsent('records')).toEqual([]);
  });

  it('photos are a separate kind from records', async () => {
    const { svc, query } = make(() => []);
    await svc.usersWithCurrentTrainingConsent('photos');
    expect(query.mock.calls[0][1]).toEqual(['ml_training_photos']);
    expect(query.mock.calls[0][0]).toMatch(/ORDER BY created_at ASC/);
  });

  it('fails closed when unmigrated', async () => {
    const { svc } = make(missing);
    expect(await svc.usersWithCurrentTrainingConsent('photos')).toEqual([]);
  });
});

describe('RecordConsentsDto', () => {
  const errs = (consents: unknown[]) => validate(plainToInstance(RecordConsentsDto, { consents }));

  it('accepts a valid row', async () => {
    expect(await errs([row()])).toHaveLength(0);
  });

  it('rejects an unknown kind, a missing version, a non-uuid id and an empty batch', async () => {
    expect(await errs([row({ kind: 'marketing' })])).not.toHaveLength(0);
    expect(await errs([row({ docVersion: '' })])).not.toHaveLength(0);
    expect(await errs([row({ id: 'x' })])).not.toHaveLength(0);
    expect(await errs([])).not.toHaveLength(0);
  });
});

describe('migration 1780702400000', () => {
  const src = readFileSync(join(__dirname, '../migrations/1780702400000-CreateUserConsents.ts'), 'utf8');

  it('enables row level security on user_consents', () => {
    expect(src).toMatch(/ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY/);
  });
});
