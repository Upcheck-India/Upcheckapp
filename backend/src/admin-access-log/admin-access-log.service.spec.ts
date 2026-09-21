import { AdminAccessLogService } from './admin-access-log.service';

const entry = {
  staffName: 'robin',
  method: 'GET',
  route: '/api/admin/feedback/abc',
  subjectType: 'feedback_id',
  subjectId: 'abc',
  ip: '203.0.113.9',
  status: 200,
};

describe('AdminAccessLogService', () => {
  it('writes a row naming the staff identity', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const svc = new AdminAccessLogService({ query } as any);

    await svc.log(entry);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO admin_access_log'),
      ['robin', 'GET', '/api/admin/feedback/abc', 'feedback_id', 'abc', '203.0.113.9', 200],
    );
  });

  it('never throws when the write fails — logging must not fail the admin request', async () => {
    const query = jest.fn().mockRejectedValue(new Error('connection reset'));
    const svc = new AdminAccessLogService({ query } as any);

    await expect(svc.log(entry)).resolves.toBeUndefined();
  });

  it('degrades quietly when admin_access_log is not migrated (42P01)', async () => {
    const query = jest.fn().mockRejectedValue({ code: '42P01' });
    const svc = new AdminAccessLogService({ query } as any);

    await expect(svc.log(entry)).resolves.toBeUndefined();
  });

  it('list() returns [] instead of throwing when the table is not migrated', async () => {
    const query = jest.fn().mockRejectedValue({ code: '42P01' });
    const svc = new AdminAccessLogService({ query } as any);

    await expect(svc.list()).resolves.toEqual([]);
  });

  it('list() prunes rows older than 12 months before reading', async () => {
    const calls: string[] = [];
    const query = jest.fn().mockImplementation((sql: string) => {
      calls.push(sql);
      return Promise.resolve(sql.startsWith('DELETE') ? undefined : []);
    });
    const svc = new AdminAccessLogService({ query } as any);

    await svc.list();

    expect(calls[0]).toContain('DELETE FROM admin_access_log');
    expect(calls[0]).toContain("interval '12 months'");
    expect(calls[1]).toContain('SELECT * FROM admin_access_log');
  });

  it('list() paginates with `before` and caps an out-of-range limit', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const svc = new AdminAccessLogService({ query } as any);

    await svc.list(10000, '2026-01-01T00:00:00.000Z');

    // Second call is the SELECT (first is the prune DELETE).
    const [, params] = query.mock.calls[1];
    expect(params).toEqual(['2026-01-01T00:00:00.000Z', 500]);
  });
});
