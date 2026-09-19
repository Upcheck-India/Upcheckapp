import apiClient from './client';
import { farmsApi } from './farms';
import { attendanceApi } from './attendance';
import { leaveRequestsApi } from './leaveRequests';
import { tasksApi } from './tasks';
import { farmMembersApi } from './farmMembers';
import type { AttendanceRecord } from './attendance';
import type { LeaveRequest } from './leaveRequests';
import type { Task } from './tasks';
import type { FarmMember, FarmRole } from './farmMembers';
import { ROLE_RANK } from '../permissions/capabilities';
import { personName } from '../utils/personName';
import { farmCard, onLeaveToday, isTodayIST, type FarmCard } from '../features/attendance/shiftState';

/**
 * The Team tab in ONE request.
 *
 * It used to assemble itself on the phone: one call for the farm list, then
 * five per farm (my attendance, farm attendance, pending leave, tasks,
 * members). For an owner with five farms that is 26 requests.
 *
 * That was the load time. Measured from Chennai, a request to the backend in
 * Oregon costs ~265ms of pure network before the server does anything —
 * `/api/liveness`, which does no work, takes that long — and Android caps
 * concurrent connections per host, so 26 requests queue into waves. No amount
 * of backend tuning touches that; the only fix is to stop making the trips.
 *
 * `GET /team/overview` does the same fan-out server-side, where each hop is
 * cheaper and runs against a pool of 20. Access is unchanged: the endpoint
 * calls the same services, so every per-farm capability check still runs.
 */
export interface TeamOverview {
    farms: any[];
    myAttendance: AttendanceRecord | null;
    allAttendance: AttendanceRecord[];
    pendingLeave: LeaveRequest[];
    tasks: Task[];
    members: FarmMember[];
    /**
     * Memberships waiting to be let in, summed over the farms in scope.
     * Owner/manager-only by construction — the backend's per-farm call needs
     * MANAGE_WORKERS and settles to 0 for a worker rather than erroring.
     * Optional: an older backend does not send it (see the fallback below).
     */
    pendingJoins?: number;
    /** The CALLER's own still-pending leave requests. A count, not rows. */
    myPendingLeave?: number;

    // ── Attendance states (spec 2026-09-14 attendance B.3–B.5). Optional: older backends omit them. ──
    /** Every OPEN record of the caller across farms in scope, newest first. `myAttendance` = myOpen[0]. */
    myOpen?: AttendanceRecord[];
    /** The caller's records with check-in on today's IST day (open or closed), newest first. */
    myToday?: AttendanceRecord[];
    /**
     * `allAttendance` is now limited to check-ins on today's IST day OR still open
     * (open ones at most 14 days old). Only sent for farms where the caller has
     * WRITE_MANAGEMENT — unchanged permission.
     */
    /** Approved leave covering today (IST), farms in scope the caller may see. */
    approvedLeaveToday?: LeaveRequest[];
    /**
     * WHO is checked in right now (open check-in on today's IST day), per farm in
     * scope, for every member including workers (founder Q5: names only). No
     * timestamps by design.
     */
    presentNow?: { farmId: string; userId: string; name: string }[];
}

/**
 * The app ships as an OTA update and the backend deploys separately, so a
 * phone WILL run this against an API that has never heard of /team/overview.
 * Without the fallback that window is a broken Team tab.
 *
 * Only a missing ENDPOINT falls back. A 500 is the endpoint existing and
 * failing, and quietly serving the slow path would hide a broken deploy behind
 * a working screen.
 */
const isMissingEndpoint = (err: any): boolean => {
    const status = err?.response?.status;
    return status === 404 || status === 501;
};

const ALL = 'all';

export async function fetchTeamOverview(scope: string): Promise<TeamOverview> {
    try {
        const { data } = await apiClient.get('/team/overview', {
            params: scope !== ALL ? { farmId: scope } : undefined,
        });
        return data;
    } catch (err) {
        if (!isMissingEndpoint(err)) throw err;
        return legacyFanOut(scope);
    }
}

/** The pre-batching path: 1 + 5×N requests. Kept only for old backends. */
async function legacyFanOut(scope: string): Promise<TeamOverview> {
    const list = (await farmsApi.getAll()).data ?? [];
    const inScope =
        scope !== ALL && list.some((f: any) => f.id === scope)
            ? list.filter((f: any) => f.id === scope)
            : list;

    const per = await Promise.all(
        inScope.map(async (farm: any) => {
            const [mine, all, leave, taskList, memberList] = await Promise.allSettled([
                attendanceApi.mine(farm.id),
                attendanceApi.getAll(farm.id),
                leaveRequestsApi.getAll(farm.id, 'pending'),
                tasksApi.getAll(farm.id),
                farmMembersApi.listMembers(farm.id),
            ]);
            const val = <T,>(r: PromiseSettledResult<{ data: T }>, fallback: T): T =>
                r.status === 'fulfilled' ? r.value.data : fallback;
            return {
                mine: val(mine, [] as AttendanceRecord[]),
                all: val(all, [] as AttendanceRecord[]),
                leave: val(leave, [] as LeaveRequest[]),
                tasks: val(taskList, [] as Task[]),
                members: val(memberList, [] as FarmMember[]),
            };
        }),
    );

    return {
        farms: list,
        // Newest open, like the server now sends (B.3) — the earliest let a
        // forgotten check-out from last week beat today's.
        myAttendance:
            per
                .flatMap((p) => p.mine)
                .filter((r) => !r.checkOutAt)
                .sort((a, b) => b.checkInAt.localeCompare(a.checkInAt))[0] ?? null,
        allAttendance: per.flatMap((p) => p.all),
        pendingLeave: per.flatMap((p) => p.leave),
        tasks: per.flatMap((p) => p.tasks),
        members: per.flatMap((p) => p.members),
        // Deliberately absent: the badge counts need the server's own scoping,
        // and a backend this old has no way to give it. No badge beats a wrong
        // one, and this path only exists for the deploy window.
    };
}

/**
 * The number on the Team tab.
 *
 * Owner/manager: the queue they are expected to clear — joins waiting to be let
 * in plus leave waiting on a decision. Everyone else: their OWN leave still
 * waiting on someone. Two different questions, one number, because they are
 * never both true for the same person.
 */
/**
 * Who may approve or decline a join request or a leave request.
 *
 * The BARE role, deliberately — not `roleCan('MANAGE_WORKERS')`. Phase 1 took
 * MANAGE_WORKERS out of the grantable set precisely because every
 * member-management endpoint re-checks owner/manager on its own, so an
 * override could only ever produce a button that 403s.
 */
export const canDecideOnTeam = (role: FarmRole | null | undefined): boolean =>
    role === 'owner' || role === 'manager';

export const teamBadgeCount = (
    overview: TeamOverview | undefined,
    canApprove: boolean,
): number => {
    if (!overview) return 0;
    return canApprove
        ? (overview.pendingJoins ?? 0) + (overview.pendingLeave?.length ?? 0)
        : (overview.myPendingLeave ?? 0);
};

// ── Roster ────────────────────────────────────────────────────────
// The cross-farm team list, derived from the SAME overview read the tab
// already has. Pure so the grouping is testable without a renderer.

/**
 * Where someone is on their shift today. `unknown` = the caller may not see it
 * (a worker on an older backend with no `presentNow`) — never shown as "Not in".
 */
export type AttendanceState = 'in' | 'out' | 'absent' | 'unknown';

export interface RosterEntry {
    /** Membership id — unique across farms, so it keys the list directly. */
    key: string;
    farmId: string;
    userId: string;
    name: string;
    role: FarmRole;
    /** Membership is waiting to be approved; they hold nothing yet. */
    pendingJoin: boolean;
    attendance: AttendanceState;
    /** Full shift state (B.2) — only where the caller manages the farm's attendance. */
    shift: FarmCard | null;
    /** Their open leave request on this farm, when the caller may see it. */
    leave: LeaveRequest | null;
    isSelf: boolean;
}

export interface RosterSection {
    farmId: string;
    farmName: string;
    data: RosterEntry[];
}

const farmShift = (overview: TeamOverview, farmId: string) =>
    overview.farms?.find((f: any) => f.id === farmId) ?? null;

/** One person's shift card on one farm, from the overview's records. */
const cardFor = (overview: TeamOverview, records: AttendanceRecord[], userId: string, farmId: string, now: Date) =>
    farmCard(
        records.filter((r) => r.userId === userId && r.farmId === farmId),
        farmShift(overview, farmId),
        now,
        onLeaveToday(overview.approvedLeaveToday, userId, farmId, now),
    );

/**
 * Today on the IST day (an older backend sends the farm's whole history, so
 * today is picked out here). An open record beats a closed one: someone who
 * checked out for lunch and back in is IN.
 */
export const attendanceStateFor = (
    records: AttendanceRecord[],
    userId: string,
    farmId: string,
    now: Date = new Date(),
): AttendanceState => {
    const { bucket } = farmCard(records.filter((r) => r.userId === userId && r.farmId === farmId), null, now);
    return bucket === 'in' ? 'in' : bucket === 'out' ? 'out' : 'absent';
};

/** The caller's own records: open anywhere + today's. Falls back for older backends. */
export const myRecords = (overview: TeamOverview | undefined, selfUserId?: string, now: Date = new Date()): AttendanceRecord[] => {
    if (!overview) return [];
    const open = overview.myOpen ?? (overview.myAttendance ? [overview.myAttendance] : []);
    const today =
        overview.myToday ??
        (overview.allAttendance ?? []).filter((r) => r.userId === selfUserId && isTodayIST(r.checkInAt, now));
    const seen = new Set<string>();
    return [...open, ...today].filter((r) => !seen.has(r.id) && !!seen.add(r.id));
};

/**
 * "My shift" (B.3): one card per farm with a record today or still open, in
 * the order of `farmIds`. Empty → the screen shows a single "Not checked in".
 */
export const myShiftCards = (
    overview: TeamOverview | undefined,
    farmIds: string[],
    selfUserId: string | undefined,
    now: Date = new Date(),
): { farmId: string; card: FarmCard }[] => {
    if (!overview || !selfUserId) return [];
    const mine = myRecords(overview, selfUserId, now);
    return farmIds
        .filter((id) => mine.some((r) => r.farmId === id))
        .map((farmId) => ({ farmId, card: cardFor(overview, mine, selfUserId, farmId, now) }));
};

/** Pending joins first — they are the only rows with an action on them. */
const compareEntries = (a: RosterEntry, b: RosterEntry): number =>
    Number(b.pendingJoin) - Number(a.pendingJoin) ||
    ROLE_RANK[b.role] - ROLE_RANK[a.role] ||
    a.name.localeCompare(b.name);

export function buildRoster(
    overview: TeamOverview | undefined,
    opts: {
        selfUserId?: string;
        unknownLabel?: string;
        now?: Date;
        /**
         * Does the caller manage this farm's attendance (WRITE_MANAGEMENT)? Only
         * then is `allAttendance` sent for it. Everyone else gets names from
         * `presentNow` (founder Q5) — or, from an older backend, no state at all
         * rather than every colleague shown "Not in" (B9).
         */
        managesAttendance?: (farmId: string) => boolean;
    } = {},
): RosterSection[] {
    if (!overview) return [];
    const { selfUserId, unknownLabel = 'Unknown', now = new Date(), managesAttendance = () => true } = opts;
    const attendance = overview.allAttendance ?? [];
    const leave = overview.pendingLeave ?? [];
    const mine = myRecords(overview, selfUserId, now);

    const byFarm = new Map<string, RosterEntry[]>();
    for (const m of overview.members ?? []) {
        const isSelf = !!selfUserId && m.userId === selfUserId;
        const full = managesAttendance(m.farmId);
        let state: AttendanceState;
        let shift: FarmCard | null = null;
        if (full) {
            shift = cardFor(overview, attendance, m.userId, m.farmId, now);
            state = shift.bucket === 'in' ? 'in' : shift.bucket === 'out' ? 'out' : 'absent';
        } else if (overview.presentNow) {
            state = overview.presentNow.some((p) => p.userId === m.userId && p.farmId === m.farmId) ? 'in' : 'absent';
        } else {
            state = 'unknown';
        }
        // The caller's own records are always readable, whatever the farm list says.
        if (isSelf && state !== 'in') {
            const own = attendanceStateFor(mine, m.userId, m.farmId, now);
            if (own !== 'absent' || state === 'unknown') state = own;
        }
        const entry: RosterEntry = {
            key: m.id,
            farmId: m.farmId,
            userId: m.userId,
            name: personName(m.user, unknownLabel),
            role: m.role,
            pendingJoin: m.status === 'pending',
            attendance: state,
            shift,
            leave: leave.find((l) => l.userId === m.userId && l.farmId === m.farmId) ?? null,
            isSelf,
        };
        const list = byFarm.get(m.farmId);
        if (list) list.push(entry);
        else byFarm.set(m.farmId, [entry]);
    }

    const farmName = (id: string) =>
        overview.farms?.find((f: any) => f.id === id)?.name ?? '';

    return Array.from(byFarm, ([farmId, data]) => ({
        farmId,
        farmName: farmName(farmId),
        data: data.sort(compareEntries),
    })).sort((a, b) => a.farmName.localeCompare(b.farmName));
}
