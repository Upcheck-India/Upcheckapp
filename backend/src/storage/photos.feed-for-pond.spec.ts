import { PhotosService } from './photos.service';

/**
 * F6 test gate: the pond Photos tab lists only this pond's photos, and money
 * photos are hidden without VIEW_FINANCIALS.
 */
describe('PhotosService.feedForPond (F6)', () => {
  const POND = 'pond-1';

  const row = (over: Partial<{ path: string; entity: string; record_id: string; uploaded_at: string; protected: boolean }>) => ({
    path: 'p.jpg',
    entity: 'health_observation',
    record_id: 'r1',
    uploaded_at: '2026-09-01T00:00:00.000Z',
    protected: false,
    ...over,
  });

  function build(rows: any[]) {
    const db = { query: jest.fn().mockResolvedValue(rows) };
    const storage = {
      sign: jest.fn().mockImplementation((_ns: string, paths: string[]) =>
        Promise.resolve({ full: paths.map((p) => `https://signed/${p}`), thumb: paths.map((p) => `https://signed/thumb/${p}`) }),
      ),
    };
    const svc = new PhotosService(db as any, storage as any, {} as any, {} as any);
    return { svc, db, storage };
  }

  it('drops money rows entirely when the caller lacks VIEW_FINANCIALS', async () => {
    const rows = [
      row({ path: 'a.jpg', entity: 'health_observation' }),
      row({ path: 'b.jpg', entity: 'expense' }),
      row({ path: 'c.jpg', entity: 'harvest' }),
    ];
    const { svc } = build(rows);
    const result = await svc.feedForPond(POND, { canViewFinancials: false });
    expect(result.map((r) => r.path)).toEqual(['a.jpg']);
  });

  it('keeps money rows for a caller WITH VIEW_FINANCIALS, marked `money: true`', async () => {
    const rows = [row({ path: 'a.jpg', entity: 'health_observation' }), row({ path: 'b.jpg', entity: 'transaction' })];
    const { svc } = build(rows);
    const result = await svc.feedForPond(POND, { canViewFinancials: true });
    expect(result.find((r) => r.path === 'b.jpg')?.money).toBe(true);
    expect(result.find((r) => r.path === 'a.jpg')?.money).toBe(false);
  });

  it('the "money" filter chip returns only money entities (incl. inventory_purchase)', async () => {
    const rows = [
      row({ path: 'a.jpg', entity: 'health_observation' }),
      row({ path: 'b.jpg', entity: 'inventory_purchase' }),
    ];
    const { svc } = build(rows);
    const result = await svc.feedForPond(POND, { canViewFinancials: true, category: 'money' });
    expect(result.map((r) => r.path)).toEqual(['b.jpg']);
  });

  it('scopes the SQL to this pond (WHERE o.pond_id = $1)', async () => {
    const { svc, db } = build([]);
    await svc.feedForPond(POND, { canViewFinancials: true });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('o.pond_id = $1'), [POND]);
  });

  it('degrades to [] before the migration is applied (42703), never throws', async () => {
    const db = { query: jest.fn().mockRejectedValue(Object.assign(new Error('x'), { code: '42703' })) };
    const svc = new PhotosService(db as any, {} as any, {} as any, {} as any);
    await expect(svc.feedForPond(POND, { canViewFinancials: true })).resolves.toEqual([]);
  });
});
