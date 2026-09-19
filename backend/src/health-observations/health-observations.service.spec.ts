import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { HealthObservationsService } from './health-observations.service';
import { HealthPhotoStorageService } from './health-photo-storage.service';
import { CreateHealthObservationsDto } from './dto/create-health-observations.dto';
import { normaliseSeverity, DISEASE_SEVERITIES } from './health.constants';
import { LEGACY_SEVERITY } from '../migrations/1780701500000-HealthObservations';

const FARM_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FARM_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const POND = '11111111-1111-4111-8111-111111111111';
const OTHER_POND = '22222222-2222-4222-8222-222222222222';
const CROP = '33333333-3333-4333-8333-333333333333';
const ROW1 = '44444444-4444-4444-8444-444444444444';
const ROW2 = '55555555-5555-4555-8555-555555555555';
const photo = (farm: string) => `${farm}/66666666-6666-4666-8666-666666666666.jpg`;

const make = (stored: any[] = []) => {
  const inserted: any[] = [];
  const qb: any = {
    insert: () => qb,
    values: jest.fn((v: any[]) => {
      inserted.push(...v);
      return qb;
    }),
    orIgnore: () => qb,
    execute: jest.fn(async () => undefined),
  };
  const repo = {
    find: jest.fn(async () => [...stored, ...inserted]),
    createQueryBuilder: jest.fn(() => qb),
    manager: { query: jest.fn(async () => [{ pond_id: POND }]) },
  };
  const farmAccess = {
    assertCanAccessPond: jest.fn(async () => ({ id: POND, farmId: FARM_A, activeCycleId: CROP })),
  };
  const photos = new HealthPhotoStorageService({ get: () => undefined } as any);
  const svc = new HealthObservationsService(repo as any, farmAccess as any, photos);
  return { svc, repo, qb, inserted, farmAccess };
};

const dto = (over: Partial<CreateHealthObservationsDto> = {}): CreateHealthObservationsDto => ({
  pondId: POND,
  observedOn: '2026-09-13',
  source: 'quick',
  signs: [
    { id: ROW1, sign: 'soft_shell', level: 'few' },
    { id: ROW2, sign: 'white_feces', level: 'none' },
  ],
  ...over,
});

describe('HealthObservationsService.create', () => {
  it('writes one row per sign; checks WRITE_OPERATIONAL on the pond', async () => {
    const { svc, inserted, farmAccess } = make();
    const rows = await svc.create(dto(), 'u1');
    expect(farmAccess.assertCanAccessPond).toHaveBeenCalledWith('u1', POND, 'WRITE_OPERATIONAL');
    expect(inserted.map((r) => [r.id, r.sign, r.level])).toEqual([
      [ROW1, 'soft_shell', 'few'],
      [ROW2, 'white_feces', 'none'],
    ]);
    expect(inserted[0]).toMatchObject({ cropId: CROP, source: 'quick', createdBy: 'u1' });
    expect(rows).toHaveLength(2);
  });

  it('idempotent replay: stored ids are not re-inserted', async () => {
    const { svc, qb } = make([
      { id: ROW1, pondId: POND },
      { id: ROW2, pondId: POND },
    ]);
    const rows = await svc.create(dto(), 'u1');
    expect(qb.values).not.toHaveBeenCalled();
    expect(rows.map((r: any) => r.id)).toEqual([ROW1, ROW2]);
  });

  it("a client id colliding with another pond's row → 403, nothing written", async () => {
    const { svc, qb } = make([{ id: ROW1, pondId: OTHER_POND }]);
    await expect(svc.create(dto(), 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(qb.values).not.toHaveBeenCalled();
  });

  it('window_key is filled server-side from the molt window of observedOn', async () => {
    // 2026-09-11 true new moon: post = 13..14 Sep.
    const a = make();
    await a.svc.create(dto({ observedOn: '2026-09-13' }), 'u1');
    expect(a.inserted[0].windowKey).toBe('2026-09-11-new');
    const b = make();
    await b.svc.create(dto({ observedOn: '2026-09-20' }), 'u1');
    expect(b.inserted[0].windowKey).toBeNull();
  });

  it("photo access: another farm's photo path → 403", async () => {
    const { svc, qb } = make();
    await expect(
      svc.create(dto({ photoUrls: [photo(FARM_B)] }), 'u1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(qb.values).not.toHaveBeenCalled();
    const ok = make();
    await ok.svc.create(dto({ photoUrls: [photo(FARM_A)] }), 'u1');
    expect(ok.inserted[0].photoUrls).toEqual([photo(FARM_A)]);
  });

  it("a cropId that is not this pond's cycle → 400", async () => {
    const { svc, repo } = make();
    repo.manager.query.mockResolvedValueOnce([{ pond_id: OTHER_POND }]);
    await expect(svc.create(dto({ cropId: CROP }), 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('HealthObservationsService.listForPond', () => {
  it('table not migrated yet (42P01) → []', async () => {
    const { svc, repo } = make();
    repo.find.mockRejectedValueOnce(Object.assign(new Error('no table'), { code: '42P01' }));
    await expect(svc.listForPond(POND, 'u1', 3)).resolves.toEqual([]);
  });

  it('checks READ on the pond', async () => {
    const { svc, farmAccess } = make();
    await svc.listForPond(POND, 'u1', 3);
    expect(farmAccess.assertCanAccessPond).toHaveBeenCalledWith('u1', POND, 'READ');
  });
});

describe('HealthPhotoStorageService.signForFarm', () => {
  it("never signs another farm's path", async () => {
    const photos = new HealthPhotoStorageService({ get: () => undefined } as any);
    const createSignedUrls = jest.fn(async (paths: string[]) => ({
      data: paths.map((p) => ({ signedUrl: `signed:${p}` })),
      error: null,
    }));
    (photos as any).client = { storage: { from: () => ({ createSignedUrls }) } };
    const urls = await photos.signForFarm(FARM_A, [photo(FARM_A), photo(FARM_B), 'https://evil/x.jpg']);
    expect(createSignedUrls).toHaveBeenCalledWith([photo(FARM_A)], 3600);
    expect(urls).toEqual([`signed:${photo(FARM_A)}`]);
  });
});

describe('CreateHealthObservationsDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const run = (body: any) =>
    pipe.transform(body, { type: 'body', metatype: CreateHealthObservationsDto });

  it('keeps each sign id (the idempotency key) through the whitelist', async () => {
    const out: any = await run(dto());
    expect(out.signs.map((s: any) => s.id)).toEqual([ROW1, ROW2]);
  });

  it('rejects an unknown sign or level', async () => {
    await expect(run(dto({ signs: [{ id: ROW1, sign: 'glowing_eyes', level: 'few' }] }))).rejects.toBeDefined();
    await expect(run(dto({ signs: [{ id: ROW1, sign: 'soft_shell', level: 'some' }] }))).rejects.toBeDefined();
  });
});

describe('severity normalisation (D6)', () => {
  it('maps the three old vocabularies to mild | moderate | severe', () => {
    expect(normaliseSeverity('Mild')).toBe('mild');
    expect(normaliseSeverity(' low ')).toBe('mild');
    expect(normaliseSeverity('medium')).toBe('moderate');
    expect(normaliseSeverity('Moderate')).toBe('moderate');
    expect(normaliseSeverity('HIGH')).toBe('severe');
    expect(normaliseSeverity('severe')).toBe('severe');
    expect(normaliseSeverity('bad')).toBeNull();
    expect(normaliseSeverity(undefined)).toBeNull();
  });

  it("the migration's backfill map agrees with the service", () => {
    for (const [from, to] of Object.entries(LEGACY_SEVERITY)) {
      expect(normaliseSeverity(from)).toBe(to);
      expect(DISEASE_SEVERITIES).toContain(to);
    }
  });
});
