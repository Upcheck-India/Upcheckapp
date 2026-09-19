import { AvatarService } from './avatar.service';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const FARM = '33333333-3333-4333-8333-333333333333';
const OLD = `${ME}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp`;
const NEW = `${ME}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp`;

/**
 * A fake users table behind DataSource.query, enough for the statements
 * AvatarService issues, plus a log of every call in order.
 */
function make(row: Record<string, any> | null = { id: ME, avatar_url: null, avatar_path: null, show_avatar_to_team: true }) {
  const log: string[] = [];
  const db = {
    query: jest.fn(async (sql: string, params: any[]) => {
      if (/^UPDATE users SET avatar_path = \$2/.test(sql)) {
        log.push(`db:set:${params[1]}`);
        if (row && (row.avatar_path ?? null) === (params[2] ?? null)) {
          row.avatar_path = params[1];
          return [[{ id: ME }], 1];
        }
        return [[], 0];
      }
      if (/^UPDATE users SET avatar_path = NULL/.test(sql)) {
        log.push('db:clear');
        if (row && row.avatar_path === params[1]) row.avatar_path = null;
        return [[], 1];
      }
      return row ? [{ ...row }] : [];
    }),
  };
  const storage = {
    configured: true,
    putImage: jest.fn(async (..._args: any[]) => {
      log.push('r2:put');
      return NEW;
    }),
    sign: jest.fn(async (_ns: string, paths: string[]) => ({
      full: paths.map((p) => `https://r2/avatars/${p}?sig`),
      thumb: paths.map((p) => `https://r2/avatars/${p.replace('.webp', '.thumb.webp')}?sig`),
    })),
    deleteImages: jest.fn(async (_ns: string, paths: string[]) => {
      log.push(`r2:delete:${paths.join(',')}`);
    }),
    deletePrefix: jest.fn(async () => undefined),
  };
  const svc = new AvatarService(db as any, storage as any);
  svc.retryDelayMs = 0;
  return { svc, db, storage, log, row };
}

const file = { buffer: Buffer.from('x'), mimetype: 'image/jpeg', size: 1 };

describe('AvatarService.upload (replace)', () => {
  it('stores the new picture, points the DB at it, THEN deletes the old one (full + thumb)', async () => {
    const { svc, storage, log, row } = make({ id: ME, avatar_url: null, avatar_path: OLD, show_avatar_to_team: true });
    const res = await svc.upload(ME, file);

    expect(storage.putImage).toHaveBeenCalledWith('avatars', expect.stringMatching(new RegExp(`^${ME}/[0-9a-f-]{36}$`)), file);
    expect(log).toEqual(['r2:put', `db:set:${NEW}`, `r2:delete:${OLD}`]);
    expect(storage.deleteImages).toHaveBeenCalledWith('avatars', [OLD]);
    expect(row!.avatar_path).toBe(NEW);
    expect(res).toMatchObject({ hasUploadedAvatar: true, avatarThumbUrl: expect.stringContaining('.thumb.webp') });
  });

  it('a first upload deletes nothing', async () => {
    const { svc, storage } = make();
    await svc.upload(ME, file);
    expect(storage.deleteImages).not.toHaveBeenCalled();
  });

  it('if the photo changed meanwhile, deletes its own upload and 409s (DB untouched)', async () => {
    const { svc, db, storage, row } = make({ id: ME, avatar_url: null, avatar_path: OLD, show_avatar_to_team: true });
    // Another request swaps the picture between our read and our write.
    const realQuery = db.query.getMockImplementation()!;
    db.query.mockImplementation(async (sql: string, params: any[]) => {
      if (/^UPDATE users SET avatar_path = \$2/.test(sql)) row!.avatar_path = 'someone-else';
      return realQuery(sql, params);
    });
    await expect(svc.upload(ME, file)).rejects.toMatchObject({ status: 409 });
    expect(storage.deleteImages).toHaveBeenCalledWith('avatars', [NEW]);
    expect(storage.deleteImages).not.toHaveBeenCalledWith('avatars', [OLD]);
  });

  it('a failing old-object delete is retried, then logged, never thrown and never skipped silently', async () => {
    const { svc, storage } = make({ id: ME, avatar_url: null, avatar_path: OLD, show_avatar_to_team: true });
    storage.deleteImages.mockRejectedValue(new Error('R2 down'));
    const error = jest.spyOn((svc as any).logger, 'error').mockImplementation(() => undefined);
    const timer = jest.spyOn(global, 'setTimeout');

    await expect(svc.upload(ME, file)).resolves.toMatchObject({ hasUploadedAvatar: true });
    expect(storage.deleteImages).toHaveBeenCalledTimes(3);
    expect(error).toHaveBeenCalledWith(expect.stringContaining(`avatars/${OLD}`));
    expect(timer).toHaveBeenCalledWith(expect.any(Function), 10 * 60_000);
    timer.mockRestore();
  });

  it('503s with a clear message, before touching R2, when the column is not migrated', async () => {
    const { svc, db, storage } = make();
    db.query.mockRejectedValue(Object.assign(new Error('column "avatar_path" does not exist'), { code: '42703' }));
    await expect(svc.upload(ME, file)).rejects.toMatchObject({ status: 503 });
    expect(storage.putImage).not.toHaveBeenCalled();
  });
});

describe('AvatarService.remove', () => {
  it('clears the DB reference, then deletes both R2 objects', async () => {
    const { svc, storage, log, row } = make({ id: ME, avatar_url: null, avatar_path: OLD, show_avatar_to_team: true });
    const res = await svc.remove(ME);
    expect(log).toEqual(['db:clear', `r2:delete:${OLD}`]);
    // deleteImages removes the image AND its .thumb.webp (see r2-storage spec).
    expect(storage.deleteImages).toHaveBeenCalledWith('avatars', [OLD]);
    expect(row!.avatar_path).toBeNull();
    expect(res).toMatchObject({ hasUploadedAvatar: false, avatarUrl: null });
  });

  it('never deletes a path outside the user\'s own folder', async () => {
    const foreign = `${OTHER}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp`;
    const { svc, storage } = make({ id: ME, avatar_url: null, avatar_path: foreign, show_avatar_to_team: true });
    jest.spyOn((svc as any).logger, 'error').mockImplementation(() => undefined);
    await svc.remove(ME);
    expect(storage.deleteImages).not.toHaveBeenCalled();
  });
});

describe('AvatarService.purgeUser (account deletion)', () => {
  it('deletes everything under avatars/<userId>/', async () => {
    const { svc, storage } = make();
    await svc.purgeUser(ME);
    expect(storage.deletePrefix).toHaveBeenCalledWith('avatars', `${ME}/`);
  });

  it('propagates an R2 failure so the deletion can be retried', async () => {
    const { svc, storage } = make();
    storage.deletePrefix.mockRejectedValue(new Error('R2 down'));
    await expect(svc.purgeUser(ME)).rejects.toThrow('R2 down');
  });
});

describe('AvatarService — who sees what', () => {
  it('an uploaded picture wins over the provider avatar', async () => {
    const { svc } = make({ id: ME, avatar_url: 'https://lh3.googleusercontent.com/a/x', avatar_path: OLD, show_avatar_to_team: true });
    const mine = await svc.mine(ME);
    expect(mine.avatarUrl).toBe(`https://r2/avatars/${OLD}?sig`);
    expect(mine.avatarThumbUrl).toContain('.thumb.webp');
  });

  it("never signs another user's path stored on a row", async () => {
    const foreign = `${OTHER}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp`;
    const { svc, storage } = make({ id: ME, avatar_url: null, avatar_path: foreign, show_avatar_to_team: true });
    const mine = await svc.mine(ME);
    expect(storage.sign).toHaveBeenCalledWith('avatars', []);
    expect(mine).toMatchObject({ avatarUrl: null, hasUploadedAvatar: false });
  });

  it('resolve: the SQL enforces the owner\'s setting and that BOTH people are on a shared live farm', async () => {
    const { svc, db } = make({ id: OTHER, avatar_url: null, avatar_path: null, show_avatar_to_team: true });
    await svc.resolve(ME, [FARM], [OTHER]);
    const [sql, params] = db.query.mock.calls[0];
    expect(params).toEqual([ME, [OTHER], [FARM]]);
    expect(sql).toMatch(/u\.id = \$1 OR \(u\.show_avatar_to_team AND EXISTS/);
    expect(sql).toMatch(/f\.deleted_at IS NULL/);
    // viewer on the farm …
    expect(sql).toMatch(/f\.user_id = \$1 OR EXISTS \(SELECT 1 FROM farm_members vm\s+WHERE vm\.farm_id = f\.id AND vm\.user_id = \$1 AND vm\.status = 'active'\)/);
    // … and the person on the same farm.
    expect(sql).toMatch(/f\.user_id = u\.id OR EXISTS \(SELECT 1 FROM farm_members um\s+WHERE um\.farm_id = f\.id AND um\.user_id = u\.id AND um\.status = 'active'\)/);
  });

  it('resolve: a person the query did not return (hidden / not a farm-mate) gets nulls, provider URL included', async () => {
    const { svc, db } = make();
    db.query.mockResolvedValue([]);
    const out = await svc.resolve(ME, [FARM], [OTHER]);
    expect(out.get(OTHER)).toEqual({ avatarUrl: null, avatarThumbUrl: null });
  });

  it('resolve: signs every visible uploaded picture in ONE batch, provider https URLs pass through', async () => {
    const { svc, db, storage } = make();
    const p2 = `${OTHER}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp`;
    db.query.mockResolvedValue([
      { id: ME, avatar_url: null, avatar_path: OLD, show_avatar_to_team: true },
      { id: OTHER, avatar_url: null, avatar_path: p2, show_avatar_to_team: true },
      { id: 'g', avatar_url: 'https://lh3.googleusercontent.com/a/g', avatar_path: null, show_avatar_to_team: true },
      { id: 'h', avatar_url: 'http://insecure/x.jpg', avatar_path: null, show_avatar_to_team: true },
    ]);
    const out = await svc.resolve(ME, [FARM], [ME, OTHER, 'g', 'h']);
    expect(storage.sign).toHaveBeenCalledTimes(1);
    expect(storage.sign).toHaveBeenCalledWith('avatars', [OLD, p2]);
    expect(out.get('g')).toEqual({ avatarUrl: 'https://lh3.googleusercontent.com/a/g', avatarThumbUrl: 'https://lh3.googleusercontent.com/a/g' });
    expect(out.get('h')).toEqual({ avatarUrl: null, avatarThumbUrl: null });
  });

  it('resolve: unmigrated DB falls back to provider avatars for farm-mates (setting defaults on)', async () => {
    const { svc, db } = make();
    db.query
      .mockRejectedValueOnce(Object.assign(new Error('no column'), { code: '42703' }))
      .mockResolvedValueOnce([{ id: OTHER, avatar_url: 'https://lh3.googleusercontent.com/a/o', avatar_path: null, show_avatar_to_team: true }]);
    const out = await svc.resolve(ME, [FARM], [OTHER]);
    expect(db.query.mock.calls[1][0]).toMatch(/NULL AS avatar_path/);
    expect(db.query.mock.calls[1][0]).not.toMatch(/show_avatar_to_team AND/);
    expect(out.get(OTHER)?.avatarUrl).toBe('https://lh3.googleusercontent.com/a/o');
  });

  it('resolve never throws: any other DB error means no pictures', async () => {
    const { svc, db } = make();
    db.query.mockRejectedValue(new Error('boom'));
    jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
    await expect(svc.resolve(ME, [FARM], [OTHER])).resolves.toEqual(
      new Map([[OTHER, { avatarUrl: null, avatarThumbUrl: null }]]),
    );
  });

  it('setVisibility refuses with a clear 503 when the column is not migrated', async () => {
    const { svc, db } = make();
    db.query.mockRejectedValue(Object.assign(new Error('no column'), { code: '42703' }));
    await expect(svc.setVisibility(ME, false)).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining('database update'),
    });
  });
});
