import { Injectable } from '@nestjs/common';
import { FarmsService } from '../farms/farms.service';
import { AttendanceService } from '../attendance/attendance.service';
import { LeaveRequestsService } from '../leave-requests/leave-requests.service';
import { TasksService } from '../tasks/tasks.service';
import { FarmMembersService } from '../farm-members/farm-members.service';
import { FarmInvitesService } from '../farm-members/farm-invites.service';
import { FarmAccessService } from '../farm-access/farm-access.service';
import { toIstDateString } from '../common/ist-date';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Everything the Team tab renders, in ONE request.
 *
 * The tab used to assemble itself client-side: one call for the farm list,
 * then five per farm (my attendance, farm attendance, pending leave, tasks,
 * members). For an owner with five farms that is 26 requests from the phone.
 *
 * Measured from a phone in Chennai, a request to the backend in Oregon costs
 * ~265ms of pure network before the server does anything — `/api/liveness`,
 * which does no work at all, takes that long. Android also caps concurrent
 * connections per host, so those 26 requests queue into waves. That network
 * cost dwarfed everything happening on the server, and no amount of backend
 * tuning could touch it: the only fix is to stop making the round trips.
 *
 * Server-side the same fan-out costs far less — the backend sits ~180ms from
 * the database instead of ~265ms from the farmer, and runs the calls in
 * parallel across a pool of 20.
 *
 * ACCESS IS UNCHANGED. This deliberately calls the same services the
 * individual endpoints call, so every per-farm capability check still runs
 * exactly as before. It is a batching layer, not a new data path — nothing
 * here queries a table directly or skips a guard.
 */
@Injectable()
export class TeamOverviewService {
  constructor(
    private readonly farms: FarmsService,
    private readonly attendance: AttendanceService,
    private readonly leaveRequests: LeaveRequestsService,
    private readonly tasks: TasksService,
    private readonly members: FarmMembersService,
    private readonly invites: FarmInvitesService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  async forUser(userId: string, scopeFarmId?: string) {
    const farms = await this.farms.findAll(userId);

    // Scope to one farm only if the caller can actually see it — an id they do
    // not hold falls back to their full set rather than throwing, matching the
    // client's own behaviour when a stale filter points at a farm they left.
    const visible = farms.map((f: { id: string }) => f.id);
    const farmIds =
      scopeFarmId && visible.includes(scopeFarmId) ? [scopeFarmId] : visible;

    // Tasks already resolve every accessible farm in a single query
    // (TasksService.findMine → getAccessibleFarmIds), so it is asked once
    // rather than per farm.
    //
    // The farm filter is passed through. It used to be omitted, so filtering
    // the Team tab to one farm scoped the members and the attendance but NOT
    // the tasks — the tab showed one farm's roster next to every farm's chores.
    const taskScope = farmIds.length === 1 ? farmIds[0] : undefined;
    const [tasks, perFarm] = await Promise.all([
      this.tasks.findMine(userId, { farmId: taskScope }).catch(() => []),
      Promise.all(farmIds.map((farmId) => this.forFarm(userId, farmId))),
    ]);

    const newestFirst = (a: any, b: any) =>
      new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime();
    const myOpen = perFarm
      .flatMap((f) => f.myOpen)
      .filter((r: { checkOutAt?: unknown }) => !r.checkOutAt)
      .sort(newestFirst);

    const today = toIstDateString(new Date());
    const approvedLeaveToday = [
      ...new Map(
        perFarm
          .flatMap((f) => [...f.approved, ...f.myLeaveAll])
          .filter(
            (l: any) =>
              l.status === 'approved' &&
              l.startDate <= today &&
              today <= l.endDate,
          )
          .map((l: any) => [l.id, l]),
      ).values(),
    ];

    return {
      farms,
      // Newest open record. It used to be the EARLIEST, so a check-out forgotten
      // last week beat today's shift (B4). Kept for old clients; new ones read
      // myOpen.
      myAttendance: myOpen[0] ?? null,
      myOpen,
      myToday: perFarm.flatMap((f) => f.myToday).sort(newestFirst),
      // Today's check-ins plus still-open ones (≤14 days), not the farm's whole
      // history (B7). WRITE_MANAGEMENT only, as before.
      allAttendance: perFarm.flatMap((f) => f.all),
      approvedLeaveToday,
      // READ-level: names only, no timestamps (Q5).
      presentNow: perFarm.flatMap((f) => f.presentNow),
      pendingLeave: perFarm.flatMap((f) => f.leave),
      // Badge counts. `pendingJoins` is owner/manager-only by construction:
      // listPending needs MANAGE_WORKERS, so a worker's per-farm call is
      // rejected and settles to [] — they simply see 0.
      pendingJoins: perFarm.reduce((n, f) => n + f.pending.length, 0),
      // The caller's OWN open leave requests, across the farms in scope. A
      // worker cannot see the farm-wide queue, so without this their Leave row
      // had no count to show without an N-per-farm fan-out from the phone.
      myPendingLeave: perFarm.reduce((n, f) => n + f.myLeave.length, 0),
      tasks,
      members: perFarm.flatMap((f) => f.members),
    };
  }

  /**
   * One farm's slice. Every call is settled independently: a worker is allowed
   * to read attendance but NOT the leave queue (WRITE_MANAGEMENT), so a 403
   * there is an expected outcome for a legitimate user, not an error. Letting
   * it reject would blank the whole tab for exactly the people who use it most.
   */
  private async forFarm(userId: string, farmId: string) {
    const now = new Date();
    const today = toIstDateString(now);
    const openFrom = toIstDateString(new Date(now.getTime() - 14 * DAY_MS));
    const [
      myOpen,
      myToday,
      allToday,
      allOpen,
      leave,
      members,
      pending,
      myLeave,
      approved,
      presentNow,
    ] = await Promise.allSettled([
      this.attendance.findMine(userId, farmId, undefined, undefined, undefined, true),
      this.attendance.findMine(userId, farmId, today),
      this.attendance.findAllForFarm(userId, farmId, today),
      this.attendance.findAllForFarm(userId, farmId, undefined, openFrom, undefined, true),
      this.leaveRequests.findAllForFarm(userId, farmId, 'pending'),
      this.members.listMembers(farmId, userId),
      this.invites.listPending(farmId, userId),
      this.leaveRequests.findMine(userId, farmId),
      this.leaveRequests.findAllForFarm(userId, farmId, 'approved'),
      this.attendance.presentNow(userId, farmId, now),
    ]);

    const val = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
      r.status === 'fulfilled' ? r.value : fallback;

    // An open record checked in today is in both reads.
    const all = [
      ...new Map(
        [...val(allToday, [] as any[]), ...val(allOpen, [] as any[])].map(
          (r: any) => [r.id, r],
        ),
      ).values(),
    ];

    return {
      myOpen: val(myOpen, [] as any[]),
      myToday: val(myToday, [] as any[]),
      all,
      leave: val(leave, [] as any[]),
      members: val(members, [] as any[]),
      pending: val(pending, [] as any[]),
      myLeaveAll: val(myLeave, [] as any[]),
      myLeave: val(myLeave, [] as any[]).filter(
        (r: { status?: string }) => r.status === 'pending',
      ),
      approved: val(approved, [] as any[]),
      presentNow: val(presentNow, [] as any[]),
    };
  }
}
