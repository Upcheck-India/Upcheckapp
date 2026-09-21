import { PhotoDeletionService, DONE_RETENTION_MONTHS } from './photo-deletion.service';

/** C6: done rows are pruned past the horizon; pending/failed rows never are. */
describe('PhotoDeletionService.pruneDone (C6 retention)', () => {
  const make = (query: jest.Mock) => {
    const svc = new PhotoDeletionService({ query, manager: { query } } as any, { configured: false } as any);
    const warn = jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
    return { svc, warn };
  };

  it('deletes only done rows older than the horizon', async () => {
    const query = jest.fn(async () => []);
    await make(query).svc.pruneDone();
    const sql = String((query.mock.calls[0] as any[])[0]);
    expect(sql).toMatch(/^DELETE FROM photo_deletions/);
    expect(sql).toContain('done_at IS NOT NULL');
    expect(sql).toContain(`interval '${DONE_RETENTION_MONTHS} months'`);
  });

  it('an unmigrated table is silent, other errors are logged, neither throws', async () => {
    const missing = make(jest.fn(async () => { throw Object.assign(new Error('x'), { code: '42P01' }); }));
    await expect(missing.svc.pruneDone()).resolves.toBeUndefined();
    expect(missing.warn).not.toHaveBeenCalled();

    const broken = make(jest.fn(async () => { throw new Error('boom'); }));
    await expect(broken.svc.pruneDone()).resolves.toBeUndefined();
    expect(broken.warn).toHaveBeenCalled();
  });

  it('drainSoon prunes at most once a day', async () => {
    const query = jest.fn(async () => []);
    const { svc } = make(query);
    const prune = jest.spyOn(svc, 'pruneDone');
    const now = jest.spyOn(Date, 'now');
    const flush = () => new Promise((r) => setImmediate(r));

    now.mockReturnValue(1e12);
    svc.drainSoon();
    await flush();
    now.mockReturnValue(1e12 + 2 * 60_000); // next drain, same day
    svc.drainSoon();
    await flush();
    expect(prune).toHaveBeenCalledTimes(1);

    now.mockReturnValue(1e12 + 25 * 3600_000);
    svc.drainSoon();
    await flush();
    expect(prune).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });
});
