import { TeamOverviewService } from './team-overview.service';
import { AttendanceService } from '../attendance/attendance.service';

/**
 * The Team tab used to make 26 requests from the phone (1 farm list + 5 calls
 * × 5 farms). A request from Chennai to the backend in Oregon costs ~265ms of
 * pure network before the server does anything, so that fan-out — not the
 * server — was the load time. This collapses it to one request.
 *
 * These tests exist to hold two things still: the fan-out really is batched,
 * and batching did not quietly widen what a caller can see.
 */
const farm = (id: string) => ({ id, name: `Farm ${id}` });

function makeService(over: any = {}) {
  const farms = {
    findAll: jest.fn().mockResolvedValue(over.farms ?? [farm('f1'), farm('f2')]),
  };
  const attendance = {
    findMine: jest.fn().mockResolvedValue(over.mine ?? []),
    findAllForFarm: jest.fn().mockResolvedValue(over.all ?? []),
    presentNow: jest.fn().mockResolvedValue(over.presentNow ?? []),
  };
  const leaveRequests = {
    findAllForFarm: jest.fn((_u: string, _f: string, status: string) =>
      Promise.resolve(status === 'approved' ? over.approved ?? [] : over.leave ?? []),
    ),
    findMine: jest.fn().mockResolvedValue(over.myLeave ?? []),
  };
  const invites = {
    listPending: jest.fn().mockResolvedValue(over.pending ?? []),
  };
  const tasks = { findMine: jest.fn().mockResolvedValue(over.tasks ?? []) };
  const members = { listMembers: jest.fn().mockResolvedValue(over.members ?? []) };
  const farmAccess = {
    getAccessibleFarmIds: jest.fn().mockResolvedValue(over.farmIds ?? ['f1', 'f2']),
  };
  const svc = new TeamOverviewService(
    farms as any,
    attendance as any,
    leaveRequests as any,
    tasks as any,
    members as any,
    invites as any,
    farmAccess as any,
  );
  return { svc, farms, attendance, leaveRequests, tasks, members, invites };
}

describe('TeamOverviewService', () => {
  it('covers every farm the caller can see, in one call', async () => {
    const { svc, attendance, members } = makeService();

    await svc.forUser('u');

    // today + open (≤14 days), per farm
    expect(attendance.findAllForFarm).toHaveBeenCalledTimes(4);
    expect(members.listMembers).toHaveBeenCalledTimes(2);
  });

  // Tasks already resolve every accessible farm in a single query, so asking
  // per farm would reintroduce the fan-out this class exists to remove.
  it('asks for tasks ONCE, not once per farm', async () => {
    const { svc, tasks } = makeService({
      farms: [farm('f1'), farm('f2'), farm('f3')],
    });

    await svc.forUser('u');

    expect(tasks.findMine).toHaveBeenCalledTimes(1);
  });

  it('narrows to a single farm when one is requested', async () => {
    const { svc, attendance } = makeService();

    await svc.forUser('u', 'f2');

    expect(attendance.findAllForFarm).toHaveBeenCalledTimes(2);
    for (const call of attendance.findAllForFarm.mock.calls) {
      expect(call.slice(0, 2)).toEqual(['u', 'f2']);
    }
  });

  /**
   * The farm filter used to scope the members and the attendance but NOT the
   * tasks — so filtering the tab to one farm still listed every farm's chores
   * underneath one farm's roster.
   */
  it('scopes the tasks to the requested farm too', async () => {
    const { svc, tasks } = makeService();

    await svc.forUser('u', 'f2');

    expect(tasks.findMine).toHaveBeenCalledWith('u', { farmId: 'f2' });
  });

  it('leaves the tasks unscoped when no farm is requested', async () => {
    const { svc, tasks } = makeService();

    await svc.forUser('u');

    expect(tasks.findMine).toHaveBeenCalledWith('u', { farmId: undefined });
  });

  /**
   * A stale filter pointing at a farm the caller has left must not become a
   * way to read that farm. It falls back to their own set.
   */
  it('ignores a scope farm the caller cannot see', async () => {
    const { svc, attendance } = makeService();

    await svc.forUser('u', 'someone-elses-farm');

    expect(attendance.findAllForFarm).toHaveBeenCalledTimes(4);
    for (const call of attendance.findAllForFarm.mock.calls) {
      expect(['f1', 'f2']).toContain(call[1]);
    }
  });

  it('returns nothing for a caller on no farms', async () => {
    const { svc, attendance } = makeService({ farms: [] });

    const out = await svc.forUser('stranger');

    expect(out.farms).toEqual([]);
    expect(out.members).toEqual([]);
    expect(attendance.findAllForFarm).not.toHaveBeenCalled();
  });

  /**
   * A worker may read attendance but NOT the leave queue, which needs
   * WRITE_MANAGEMENT. That 403 is an expected outcome for a legitimate user,
   * so it must degrade to "no leave rows" rather than blanking the tab for
   * exactly the people who use it most.
   */
  it('keeps the rest of the tab when one read is refused', async () => {
    const { svc, leaveRequests } = makeService({ members: [{ id: 'm1' }] });
    leaveRequests.findAllForFarm.mockRejectedValue(new Error('Forbidden'));

    const out = await svc.forUser('worker');

    expect(out.pendingLeave).toEqual([]);
    expect(out.members).toHaveLength(2); // one per farm, still there
  });

  it('picks the open attendance record as the current one', async () => {
    const { svc } = makeService({
      farms: [farm('f1')],
      mine: [
        { checkInAt: '2026-08-28T02:00:00Z', checkOutAt: '2026-08-28T06:00:00Z' },
        { checkInAt: '2026-08-28T07:00:00Z', checkOutAt: null },
      ],
    });

    const out = await svc.forUser('u');

    expect(out.myAttendance?.checkInAt).toBe('2026-08-28T07:00:00Z');
  });

  it('counts pending joins across farms for the badge', async () => {
    const { svc } = makeService({ pending: [{ userId: 'a' }, { userId: 'b' }] });

    expect((await svc.forUser('owner')).pendingJoins).toBe(4); // 2 farms × 2
  });

  /** A worker is refused the pending queue (MANAGE_WORKERS) — badge is 0. */
  it('reports zero pending joins when the caller may not see the queue', async () => {
    const { svc, invites } = makeService();
    invites.listPending.mockRejectedValue(new Error('Forbidden'));

    expect((await svc.forUser('worker')).pendingJoins).toBe(0);
  });

  /** Own open requests only — decided ones are not "waiting on someone". */
  it("counts only the caller's still-pending leave requests", async () => {
    const { svc } = makeService({
      farms: [farm('f1')],
      myLeave: [{ status: 'pending' }, { status: 'approved' }],
    });

    expect((await svc.forUser('worker')).myPendingLeave).toBe(1);
  });

  it('reports no open record when every shift is closed', async () => {
    const { svc } = makeService({
      farms: [farm('f1')],
      mine: [{ checkInAt: '2026-08-28T02:00:00Z', checkOutAt: '2026-08-28T06:00:00Z' }],
    });

    expect((await svc.forUser('u')).myAttendance).toBeNull();
  });

  // B4: a check-out forgotten last week (other farm) must not beat today's shift.
  it('myAttendance is the NEWEST open record across farms; myOpen newest first', async () => {
    const { svc, attendance } = makeService();
    attendance.findMine.mockImplementation((_u, farmId, date, _f, _t, openOnly) => {
      if (!openOnly) return Promise.resolve([]);
      return Promise.resolve(
        farmId === 'f1'
          ? [{ id: 'old', farmId: 'f1', checkInAt: new Date('2026-09-07T01:00:00Z'), checkOutAt: null }]
          : [{ id: 'new', farmId: 'f2', checkInAt: new Date('2026-09-14T01:00:00Z'), checkOutAt: null }],
      );
    });

    const out = await svc.forUser('u');

    expect(out.myAttendance?.id).toBe('new');
    expect(out.myOpen.map((r: any) => r.id)).toEqual(['new', 'old']);
    // open read has no date cap; today read is today's IST date
    expect(attendance.findMine).toHaveBeenCalledWith('u', 'f1', undefined, undefined, undefined, true);
    expect(attendance.findMine).toHaveBeenCalledWith('u', 'f1', expect.stringMatching(/^\d{4}-\d\d-\d\d$/));
  });

  // B7: not the farm's whole history — today's check-ins plus open ≤ 14 days.
  it('allAttendance = today (IST) ∪ open from 14 days ago, deduped', async () => {
    const { svc, attendance } = makeService({ farms: [farm('f1')] });
    const both = { id: 'r1', checkInAt: 'x', checkOutAt: null };
    attendance.findAllForFarm.mockImplementation((_u, _f, date) =>
      Promise.resolve(date ? [both, { id: 'r2' }] : [both, { id: 'r3' }]),
    );

    const out = await svc.forUser('owner');

    expect(out.allAttendance.map((r: any) => r.id).sort()).toEqual(['r1', 'r2', 'r3']);
    const openCall = attendance.findAllForFarm.mock.calls.find((c: any[]) => c[5] === true)!;
    const fromMs = new Date(`${openCall[3]}T00:00:00+05:30`).getTime();
    const days = (Date.now() - fromMs) / 86400000;
    expect(days).toBeGreaterThanOrEqual(14);
    expect(days).toBeLessThan(15);
  });

  it('approvedLeaveToday covers today only, from the farm queue and own requests, deduped', async () => {
    const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
    const cover = { id: 'l1', status: 'approved', startDate: '2000-01-01', endDate: '2999-01-01' };
    const { svc } = makeService({
      farms: [farm('f1')],
      approved: [cover, { id: 'l2', status: 'approved', startDate: '2000-01-01', endDate: '2000-01-02' }],
      myLeave: [cover, { id: 'l3', status: 'approved', startDate: today, endDate: today }, { id: 'l4', status: 'pending', startDate: today, endDate: today }],
    });

    const out = await svc.forUser('u');

    expect(out.approvedLeaveToday.map((l: any) => l.id).sort()).toEqual(['l1', 'l3']);
  });

  // Q5: a worker sees WHO is in, never when. Uses the real AttendanceService so
  // the stripping is exercised, with farm access that refuses WRITE_MANAGEMENT.
  it('worker payload: presentNow names, no colleague check-in times anywhere', async () => {
    const colleagueIn = new Date('2026-09-14T00:35:00Z');
    const repo = {
      find: jest.fn((opts: any) =>
        Promise.resolve(
          opts.where.userId
            ? [] // the worker's own records
            : [{ id: 'c1', farmId: 'f1', userId: 'col', checkInAt: colleagueIn, checkOutAt: null, user: { firstName: 'Suresh' } }],
        ),
      ),
    };
    const access = {
      assertCanAccessFarm: jest.fn((_u: string, _f: string, cap: string) =>
        cap === 'READ' ? Promise.resolve({}) : Promise.reject(new Error('Forbidden')),
      ),
    };
    const realAttendance = new AttendanceService(repo as any, access as any, {} as any);
    const leave = {
      findAllForFarm: jest.fn().mockRejectedValue(new Error('Forbidden')),
      findMine: jest.fn().mockResolvedValue([]),
    };
    const svc = new TeamOverviewService(
      { findAll: jest.fn().mockResolvedValue([farm('f1')]) } as any,
      realAttendance,
      leave as any,
      { findMine: jest.fn().mockResolvedValue([]) } as any,
      { listMembers: jest.fn().mockResolvedValue([]) } as any,
      { listPending: jest.fn().mockRejectedValue(new Error('Forbidden')) } as any,
      {} as any,
    );

    const out = await svc.forUser('worker');

    expect(out.presentNow).toEqual([{ farmId: 'f1', userId: 'col', name: 'Suresh' }]);
    expect(out.allAttendance).toEqual([]);
    const json = JSON.stringify(out);
    expect(json).not.toContain(colleagueIn.toISOString());
    expect(json).not.toContain('checkInAt');
  });
});
