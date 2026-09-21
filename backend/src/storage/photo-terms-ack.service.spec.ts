import { PhotoTermsAckService } from './photo-terms-ack.service';

/** F8.1 test gate: acknowledge once; idempotent; degrades before migration. */
describe('PhotoTermsAckService (F8.1)', () => {
  const USER = 'user-1';

  it('acknowledge() sets photo_terms_ack_at and returns it', async () => {
    const db = { query: jest.fn().mockResolvedValue([{ photo_terms_ack_at: '2026-09-21T00:00:00.000Z' }]) };
    const svc = new PhotoTermsAckService(db as any);
    const result = await svc.acknowledge(USER);
    expect(result.ackedAt).toBe('2026-09-21T00:00:00.000Z');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('COALESCE(photo_terms_ack_at, now())'), [USER]);
  });

  it('acknowledging twice keeps the FIRST timestamp (COALESCE, not overwrite)', async () => {
    // The SQL itself guarantees this (COALESCE never replaces an existing
    // value); this test locks the query shape so a future edit can't drop it.
    const db = { query: jest.fn().mockResolvedValue([{ photo_terms_ack_at: 'first' }]) };
    const svc = new PhotoTermsAckService(db as any);
    await svc.acknowledge(USER);
    await svc.acknowledge(USER);
    expect(db.query.mock.calls[0][0]).toContain('COALESCE(photo_terms_ack_at, now())');
    expect(db.query.mock.calls[1][0]).toContain('COALESCE(photo_terms_ack_at, now())');
  });

  it('ackedAt() returns null (not a throw) before the migration is applied', async () => {
    const db = { query: jest.fn().mockRejectedValue(Object.assign(new Error('x'), { code: '42703' })) };
    const svc = new PhotoTermsAckService(db as any);
    await expect(svc.ackedAt(USER)).resolves.toBeNull();
  });

  it('acknowledge() degrades (not a throw) before the migration is applied', async () => {
    const db = { query: jest.fn().mockRejectedValue(Object.assign(new Error('x'), { code: '42703' })) };
    const svc = new PhotoTermsAckService(db as any);
    jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
    await expect(svc.acknowledge(USER)).resolves.toEqual({ ackedAt: null });
  });
});
