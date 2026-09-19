/**
 * TeamScreen — the "Team" tab of the redesigned owner/manager navigation.
 *
 * Built to frontend/design/team.png. It pulls the three team-shaped things that
 * were previously scattered behind the "More" menu into one place, in the order
 * the design puts them:
 *
 *   1. Your own attendance, with a single Check out action — the thing you act
 *      on first, so it sits above everything.
 *   2. Attendance and Leave as summary rows with counts, tappable through to
 *      the full screens.
 *   3. Today's team tasks, per-person tallies first, then the tasks themselves.
 *
 * Note the split with Home: Home shows YOUR tasks, Team shows the WHOLE team's.
 * Both read the same tasks API; the difference is the assignee filter.
 *
 * Like Money and Today, it opens on EVERY farm at once. It used to read the
 * app-wide active farm and show only that one, with no way to switch and no
 * total — so an owner with three farms had to visit three Team tabs and add up
 * the rosters by hand to answer "who is working today". The scope chips narrow
 * it; the farm name on each row says where the work is.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Pressable, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CacheNotice } from '../../components/ui/CacheNotice';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge, type StatusType } from '../../components/ui/StatusBadge';
import { SummaryRow } from '../../components/ui/SummaryRow';
import { Icon } from '../../components/ui/Icon';
import { theme } from '../../theme';
import { useActiveFarmStore } from '../../store/activeFarmStore';
import { useAuthStore } from '../../store/authStore';
import { useMembershipStore } from '../../store/membershipStore';
import { roleCan, type FarmCapability } from '../../permissions/capabilities';
import { saveRecord } from '../../sync/recordSync';
import { apiErrorMessage } from '../../api/errors';
import { attendanceApi, type AttendanceRecord } from '../../api/attendance';
import { leaveRequestsApi, type LeaveRequest } from '../../api/leaveRequests';
import { tasksApi, splitTasks, taskAssignees, type Task } from '../../api/tasks';
import { dueLabel, isOverdue, repeatLabel, originLabel } from '../tasks/taskLabels';
import { farmMembersApi, type FarmMember } from '../../api/farmMembers';
import { farmsApi, type Farm } from '../../api/farms';
import {
    buildRoster,
    canDecideOnTeam,
    fetchTeamOverview,
    myRecords,
    myShiftCards,
    type RosterEntry,
} from '../../api/teamOverview';
import { personName } from '../../utils/personName';
import { Avatar } from '../../components/ui/Avatar';
import { formatTime, formatWeekday } from '../../utils/formatDate';
import { ShiftBadge, ShiftCard, useShiftLine } from '../../components/attendance/ShiftCard';
import { CheckOutSheet } from '../../components/attendance/CheckOutSheet';
import {
    BADGE_KEY,
    formatDuration,
    headcount,
    isTodayIST,
    type ShiftState,
    type TFn,
} from '../../features/attendance/shiftState';
import { invalidateForEntity } from '../../query/client';
import { qk } from '../../query/client';
import { useAppQuery, useRefetchOnFocus } from '../../query/hooks';
import { useFlag } from '../../features/remoteFlags';

/** Scope value meaning "every farm I can see". */
const ALL = 'all';

// Stable empty fallbacks — a fresh `[]` each render would break the memos below.
const EMPTY_FARMS: Farm[] = [];
const EMPTY_ATTENDANCE: AttendanceRecord[] = [];
const EMPTY_LEAVE: LeaveRequest[] = [];
const EMPTY_TASKS: Task[] = [];
const EMPTY_MEMBERS: FarmMember[] = [];

/** Tasks the design treats as "still to do" for the per-person tallies. */
const OPEN_STATUSES = ['open', 'in_progress'];

/**
 * The four actions on this tab that need ONE farm while the tab is showing
 * every farm's work, and the capability each one needs on that farm.
 *
 * This screen used to hand them `farms[0]` — an arbitrary farm the farmer
 * never chose. Opening the roster of the wrong farm is merely confusing;
 * checking in on the wrong farm puts a shift on the wrong payroll. So when
 * more than one farm qualifies, the farmer picks.
 */
type TeamAction = 'members' | 'attendance' | 'assign' | 'checkin' | 'repeating';

const ACTION_CAPABILITY: Record<TeamAction, FarmCapability> = {
    members: 'MANAGE_WORKERS',
    // Creating farm work is WRITE_MANAGEMENT, not MANAGE_WORKERS — the server
    // checks that one, so gating the button on the other offers a 403.
    assign: 'WRITE_MANAGEMENT',
    // Stopping a daily task is the same authority as creating one.
    repeating: 'WRITE_MANAGEMENT',
    attendance: 'WRITE_OPERATIONAL',
    checkin: 'WRITE_OPERATIONAL',
};

/** Headcount groups, most urgent first (B.5). `just_in` sits with `on_shift`. */
const GROUPS: ShiftState[] = ['forgot', 'overdue', 'due_soon', 'on_shift', 'out', 'on_leave', 'not_in'];
const groupOf = (s: ShiftState): ShiftState => (s === 'just_in' ? 'on_shift' : s);

/** Which record the check-out sheet is open for, and whose. */
interface SheetTarget {
    record: AttendanceRecord;
    farmId: string;
    /** Set when a manager acts on someone else. */
    personName?: string;
}

const memberName = (m?: FarmMember) => personName(m?.user, "");

/**
 * Task status → StatusBadge tone. A bordered pill reads at arm's length in
 * sun far better than the coloured uppercase text this used to be, and the
 * word is still there — colour is never the only signal.
 */
const STATUS_TONE: Record<string, StatusType> = {
    open: 'idle',
    in_progress: 'info',
    done: 'warning',
    verified: 'safe',
};

export const TeamScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const tasksOn = useFlag('tasks');
    const { selectedFarm, setSelectedFarm } = useActiveFarmStore();
    const userId = useAuthStore((s) => s.user?.id);

    /** `ALL` means every farm — the tab's default, same as Money and Today. */
    const [scope, setScope] = useState<string>(ALL);
    const [showAllTasks, setShowAllTasks] = useState(false);
    /** Which farm-needing action the chooser is currently open for. */
    const [chooserFor, setChooserFor] = useState<TeamAction | null>(null);
    const [busy, setBusy] = useState(false);
    const [sheet, setSheet] = useState<SheetTarget | null>(null);
    /** Which headcount farm row is expanded. */
    const [expandedFarm, setExpandedFarm] = useState<string | null>(null);
    const exportOn = useFlag('export');
    const lineFor = useShiftLine();
    const now = new Date();

    /**
     * One cached read for the tab, keyed on scope. Memory-only rather than
     * persisted: rosters and tasks change hour to hour and are not what a
     * farmer opens the app with no signal to see (see src/query/client.ts).
     */
    const query = useAppQuery({
        queryKey: qk.team(scope),
        // ONE request for the whole tab. This used to fan out to 1 + 5×N calls
        // (26 for a five-farm owner) from the phone, and at ~265ms of network
        // per request from rural India that fan-out WAS the load time. The
        // server does the same work far more cheaply — see api/teamOverview.ts.
        queryFn: () => fetchTeamOverview(scope),
    });

    useRefetchOnFocus(qk.team(scope));

    const farms = query.data?.farms ?? EMPTY_FARMS;
    const allAttendance = query.data?.allAttendance ?? EMPTY_ATTENDANCE;
    const pendingLeave = query.data?.pendingLeave ?? EMPTY_LEAVE;
    const tasks = query.data?.tasks ?? EMPTY_TASKS;
    const members = query.data?.members ?? EMPTY_MEMBERS;
    // The two numbers behind the tab badge, shown here as rows so the badge
    // always resolves to something the farmer can see and act on.
    const pendingJoins = query.data?.pendingJoins ?? 0;
    const myPendingLeave = query.data?.myPendingLeave ?? 0;
    const hasData = query.data != null;

    const activeScope = scope !== ALL && farms.some((f) => f.id === scope) ? scope : ALL;
    const scopeFarms = useMemo(
        () => (activeScope === ALL ? farms : farms.filter((f) => f.id === activeScope)),
        [activeScope, farms],
    );

    // The farm this screen is *about* — the eyebrow, and the fallback target
    // for rows that legitimately span every farm. It is NOT the farm an action
    // silently runs against any more; see `startAction`.
    const primaryFarm =
        scopeFarms.find((f) => f.id === activeScope) ??
        farms.find((f) => f.id === selectedFarm?.id) ??
        farms[0];
    const farmId = primaryFarm?.id;
    const farmName = (id: string) => farms.find((f) => f.id === id)?.name;

    // Capabilities per farm rather than for one farm. An owner of three farms
    // who is a viewer on the fourth must see the actions (they can act on
    // three) but must never be offered the fourth in the chooser.
    //
    // usePermissions resolves ONE farm and cannot be called in a loop, so this
    // goes to the same `roleCan` it calls.
    const grantForFarm = useMembershipStore((s) => s.grantForFarm);
    const memberships = useMembershipStore((s) => s.memberships);
    const farmsWith = useCallback(
        // `memberships` is in the deps because `grantForFarm` closes over the
        // store lazily — its identity does not change when the list loads.
        // Resolve through the full grant so a per-member override or a farm
        // role policy counts here exactly as it does in usePermissions.
        (cap: FarmCapability) =>
            scopeFarms.filter((f) => {
                const g = grantForFarm(f.id);
                return roleCan(g.role, cap, g.overrides, g.policy);
            }),
        [scopeFarms, grantForFarm, memberships],
    );

    const canManage = farmsWith('MANAGE_WORKERS').length > 0;
    const canRecordData = farmsWith('WRITE_OPERATIONAL').length > 0;
    /** Who may create or stop farm tasks — the capability the server checks. */
    const canCreateTasks = farmsWith('WRITE_MANAGEMENT').length > 0;

    // ── My shift (B.3/B.4) ──
    const opFarmIds = farmsWith('WRITE_OPERATIONAL').map((f) => f.id);
    const myCards = myShiftCards(query.data, opFarmIds, userId, now);
    /** My newest open record anywhere in the overview — what a check-in elsewhere will close (Q6). */
    const myOpen = myRecords(query.data, userId, now).find((r) => !r.checkOutAt) ?? null;
    /** Farms I could check in to: eligible, and not where I am already in. */
    const checkInFarms = useMemo(
        () => farmsWith('WRITE_OPERATIONAL').filter((f) => !myCards.some((x) => x.farmId === f.id && x.card.record && !x.card.record.checkOutAt)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [farmsWith, query.data, userId],
    );
    const eligibleFor = useCallback(
        (action: TeamAction) => (action === 'checkin' ? checkInFarms : farmsWith(ACTION_CAPABILITY[action])),
        [checkInFarms, farmsWith],
    );

    const checkIn = useCallback(
        async (id: string) => {
            setBusy(true);
            try {
                // Through the sync queue, exactly like AttendanceScreen: a
                // check-in is a field log and the farmer may have no signal.
                const res = await saveRecord({
                    entity: 'attendance',
                    endpoint: '/attendance/check-in',
                    // checkInAt is sent EXPLICITLY, and must stay that way.
                    // Without it the server falls back to the column default, which is
                    // CURRENT_TIMESTAMP at the moment the row is written — and offline that
                    // is when the queue DRAINS, not when the worker pressed the button. A
                    // 06:00 check-in with no signal, drained at 18:00, recorded an 18:00
                    // start and erased the whole day. This is a pay record.
                    payload: { farmId: id, checkInAt: new Date().toISOString() },
                });
                Alert.alert(
                    t('attendance.checkedInTitle'),
                    res.queued ? t('team.savedOffline') : t('attendance.checkedInSub'),
                );
                void query.refetch();
            } catch (e) {
                Alert.alert(t('common.error'), apiErrorMessage(e, t('attendance.checkInError')));
            } finally {
                setBusy(false);
            }
        },
        [query, t],
    );

    const runAction = useCallback(
        (action: TeamAction, farm: Farm) => {
            switch (action) {
                case 'members':
                    navigation.navigate('FarmMembers', { farmId: farm.id, farmName: farm.name });
                    break;
                case 'attendance':
                    navigation.navigate('Attendance', { farmId: farm.id, farmName: farm.name });
                    break;
                case 'assign':
                    // Straight to the composer. "Assign" used to open the task
                    // LIST, which had no assignee control on it at all — the
                    // action named the one thing it could not do.
                    navigation.navigate('TaskCompose', { farmId: farm.id, farmName: farm.name, scope: 'farm' });
                    break;
                case 'repeating':
                    navigation.navigate('RecurringTasks', { farmId: farm.id, farmName: farm.name });
                    break;
                case 'checkin':
                    // Open elsewhere: say what will happen before it happens (B.4).
                    if (myOpen && myOpen.farmId !== farm.id) {
                        Alert.alert(
                            t('team.switchFarm', { farm: farm.name }),
                            t('team.switchFarmBody', {
                                from: farms.find((f) => f.id === myOpen.farmId)?.name ?? '',
                                since: formatTime(myOpen.checkInAt),
                            }),
                            [
                                { text: t('common.cancel'), style: 'cancel' },
                                { text: t('team.switchFarm', { farm: farm.name }), onPress: () => void checkIn(farm.id) },
                            ],
                        );
                    } else {
                        void checkIn(farm.id);
                    }
                    break;
            }
        },
        [navigation, checkIn, myOpen, farms, t],
    );

    /** One eligible farm: just do it. More than one: ask. */
    const startAction = useCallback(
        (action: TeamAction) => {
            const eligible = eligibleFor(action);
            if (eligible.length === 1) runAction(action, eligible[0]);
            else if (eligible.length > 1) setChooserFor(action);
        },
        [eligibleFor, runAction],
    );

    const chooserFarms = chooserFor ? eligibleFor(chooserFor) : EMPTY_FARMS;

    /** Own check-out: confirm naming the farm; errors shown, not swallowed (B5). */
    const confirmCheckOut = useCallback(
        (record: AttendanceRecord) => {
            const name = farms.find((f) => f.id === record.farmId)?.name ?? '';
            Alert.alert(
                t('team.checkOutOfFarm', { farm: name }),
                t('team.checkOutConfirmBody', {
                    time: formatTime(record.checkInAt),
                    elapsed: formatDuration(Date.now() - Date.parse(record.checkInAt), t as unknown as TFn),
                }),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('team.checkOut'),
                        onPress: async () => {
                            setBusy(true);
                            try {
                                await attendanceApi.checkOut(record.id);
                                invalidateForEntity('attendance');
                                void query.refetch();
                            } catch (e) {
                                Alert.alert(t('common.error'), apiErrorMessage(e, t('attendance.checkOutError')));
                            } finally {
                                setBusy(false);
                            }
                        },
                    },
                ],
            );
        },
        [farms, query, t],
    );

    if (query.isPending && !hasData) {
        return (
            <ScreenWrapper>
                <View style={styles.loadingBlock}>
                    <Skeleton width="100%" height={72} />
                    <Skeleton width="100%" height={64} />
                    <Skeleton width="100%" height={64} />
                </View>
            </ScreenWrapper>
        );
    }

    // "We could not read your team" is not "you have no farm" — this screen
    // used to fall through to the empty state on a failed read and tell a
    // manager with a full roster that they had no farm.
    if (query.isError && !hasData) {
        return (
            <ScreenWrapper>
                <ErrorState title={t('team.title')} error={query.error} onRetry={() => query.refetch()} />
            </ScreenWrapper>
        );
    }

    if (!farmId) {
        return (
            <ScreenWrapper>
                <EmptyState
                    icon="account-group-outline"
                    title={t('team.noFarmTitle')}
                    subtitle={t('team.noFarmSub')}
                />
            </ScreenWrapper>
        );
    }

    // Distinct people with any record on today's IST day (B7) — not every open
    // record in the farm's history.
    const checkedInToday = new Set(
        allAttendance.filter((r) => isTodayIST(r.checkInAt, now)).map((r) => r.userId),
    ).size;

    // ── Headcount (B.5) ──
    const managedIds = new Set(farmsWith('WRITE_MANAGEMENT').map((f) => f.id));
    const scopeIds = new Set(scopeFarms.map((f) => f.id));
    const managedSections = buildRoster(query.data, {
        selfUserId: userId,
        unknownLabel: t('team.unknownPerson'),
        now,
        managesAttendance: (id) => managedIds.has(id),
    })
        .filter((s) => scopeIds.has(s.farmId) && managedIds.has(s.farmId))
        .map((s) => ({ ...s, data: s.data.filter((e) => !e.pendingJoin && e.shift) }))
        .filter((s) => s.data.length > 0);
    const peopleOf = (data: RosterEntry[]) => data.map((e) => ({ userId: e.userId, card: e.shift! }));
    const allHeadcount = headcount(managedSections.flatMap((s) => peopleOf(s.data)));
    // Workers (Q5): who is in right now, names only, on the farms they do not manage.
    const presentNow = query.data?.presentNow;
    const namesOnlyFarms = presentNow ? scopeFarms.filter((f) => !managedIds.has(f.id)) : EMPTY_FARMS;

    const renderPerson = (e: RosterEntry, farmIdOfRow: string) => {
        const card = e.shift!;
        const open = !!card.record && !card.record.checkOutAt;
        const canAct = open && !e.isSelf && canDecideOnTeam(grantForFarm(farmIdOfRow).role);
        return (
            <View key={e.key} style={styles.personRow} testID={`person-${farmIdOfRow}-${e.userId}`}>
                <Avatar uri={e.avatarThumbUrl} initials={e.initials} seed={e.userId} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.personName} numberOfLines={1}>
                        {e.isSelf ? t('team.youSuffix', { name: e.name }) : e.name}
                        <Text style={styles.personRole}>{` · ${t(`members.role_${e.role}`)}`}</Text>
                    </Text>
                    <Text style={styles.personLine}>{lineFor(card, now)}</Text>
                </View>
                {canAct ? (
                    <Button
                        title={t('team.checkOut')}
                        variant="outlined"
                        onPress={() => setSheet({ record: card.record!, farmId: farmIdOfRow, personName: e.name })}
                        style={styles.personBtn}
                    />
                ) : (
                    <ShiftBadge state={card.state} />
                )}
            </View>
        );
    };
    // Deduped by person: someone who works two of your farms is one member of
    // your team, and counting them twice would make "2 of 4" out of two people.
    const activeMembers = members
        .filter((m) => m.status !== 'pending')
        .filter((m, i, all) => all.findIndex((x) => x.userId === m.userId) === i);
    // Deduped the same way: one person waiting on two of your farms is one
    // person to let in, not two.
    const pendingCount = members
        .filter((m) => m.status === 'pending')
        .filter((m, i, all) => all.findIndex((x) => x.userId === m.userId) === i).length;
    const openTasks = tasks.filter((tk) => OPEN_STATUSES.includes(tk.status));
    const overdue = openTasks.filter((tk) => isOverdue(tk)).length;

    /**
     * "Your tasks" / "Others' tasks", the split the farmer asked for.
     *
     * Yours also catches the two kinds this board never showed you: a task with
     * NO named assignee (everyone in scope, so you), and your own personal
     * note. A personal task can never cross into "others'" — see splitTasks.
     */
    const { mine: myTasks, others: otherTasks } = splitTasks(tasks, userId);
    const cut = (list: Task[]) => (showAllTasks ? list : list.slice(0, 5));
    const hiddenCount = showAllTasks
        ? 0
        : Math.max(0, myTasks.length - 5) + Math.max(0, otherTasks.length - 5);

    /** "Ravi 1/3" — done vs assigned, per person, for today. */
    const tallies = activeMembers
        .map((m) => {
            const assigned = tasks.filter((tk) => taskAssignees(tk).includes(m.userId));
            if (assigned.length === 0) return null;
            const done = assigned.filter((tk) => !OPEN_STATUSES.includes(tk.status)).length;
            return { name: memberName(m).split(' ')[0], done, total: assigned.length };
        })
        .filter(Boolean) as { name: string; done: number; total: number }[];

    /**
     * One task row. `mine` decides the third fact on the meta line: on your own
     * row it is who set it (you, or a manager), on somebody else's it is whose
     * work it is — the two questions are different and only one fits.
     */
    const renderTask = (tk: Task, mine: boolean) => {
        const late = isOverdue(tk);
        const names = taskAssignees(tk)
            .map((id) => memberName(activeMembers.find((m) => m.userId === id)))
            .filter(Boolean)
            .join(', ');
        const who = mine
            ? tk.scope === 'personal'
                ? t('tasks.badgePersonal')
                : originLabel(t, tk, userId)
            : names || t('tasks.assignEveryone');
        return (
            <TouchableOpacity
                key={tk.id}
                style={styles.taskRow}
                accessibilityRole="button"
                accessibilityLabel={`${tk.title} · ${t(`team.status_${tk.status}`, tk.status)}`}
                onPress={() => navigation.navigate('TaskList', { farmId: tk.farmId, farmName: farmName(tk.farmId) })}
            >
                <View
                    style={[
                        styles.taskBar,
                        { backgroundColor: late ? theme.roles.light.dangerBorder : theme.roles.light.borderDefault },
                    ]}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{tk.title}</Text>
                    <Text
                        style={[styles.taskMeta, late && { color: theme.roles.light.dangerText }]}
                        numberOfLines={1}
                    >
                        {[
                            who,
                            dueLabel(t, tk.dueDate),
                            repeatLabel(t, tk),
                            activeScope === ALL ? farmName(tk.farmId) : null,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </Text>
                </View>
                <StatusBadge
                    status={STATUS_TONE[tk.status] ?? 'idle'}
                    label={t(`team.status_${tk.status}`, tk.status)}
                />
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.eyebrow} numberOfLines={1}>
                        {[
                            activeScope === ALL ? t('team.allFarms') : primaryFarm?.name,
                            formatWeekday(new Date()),
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </Text>
                    <Text style={styles.title}>{t('team.title')}</Text>
                </View>
                {/* The roster is the thing this opens, so it says so — and it
                    is a real 48dp button, not a text link that nobody on a
                    low-end screen in sun reads as tappable. */}
                {canManage && (
                    <Button
                        /**
                         * The count is the point (W1).
                         *
                         * Someone waiting for approval holds nothing and can do
                         * nothing until an owner acts, and until now the only
                         * prompt to act was a push notification — which has to
                         * arrive, survive the tray, and be tapped. If it did
                         * not, the worker sat in a waiting state indefinitely
                         * while the owner had no idea anyone was there.
                         *
                         * Putting the number on the button an owner already
                         * looks at makes the queue visible without depending on
                         * a notification at all.
                         */
                        title={
                            pendingCount > 0
                                ? t('team.manageTeamPending', { count: pendingCount })
                                : t('team.manageTeam')
                        }
                        variant="outlined"
                        onPress={() => startAction('members')}
                        style={styles.manageBtn}
                    />
                )}
            </View>

            <CacheNotice updatedAt={query.dataUpdatedAt} stale={query.isError} />

            {/* Scope chips, like Money. With a single farm "All farms" and its
                name are the same view under two labels, so they only appear
                from two. ChipGroup wraps rather than scrolling: a chip a
                farmer cannot see is a filter they will not find. */}
            {farms.length > 1 && (
                <View style={styles.chips}>
                    <ChipGroup
                        options={[
                            { value: ALL, label: t('team.allFarms') },
                            ...farms.map((f) => ({ value: f.id, label: f.name })),
                        ]}
                        value={activeScope}
                        // ChipGroup deselects on a second tap of the active
                        // chip; "no scope" means every farm here.
                        onChange={(next: string | null) => {
                            const value = next ?? ALL;
                            setScope(value);
                            // Keep the app-wide active farm in step, so the
                            // roster and leave screens open on the same one.
                            const farm = farms.find((f) => f.id === value);
                            if (farm) setSelectedFarm({ id: farm.id, name: farm.name });
                        }}
                    />
                </View>
            )}

            <ScrollView
                contentContainerStyle={styles.body}
                refreshControl={
                    <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
                }
            >
                {/* Your own shift — the one thing on this screen you act on.
                    The card used to appear only once you were ALREADY checked
                    in, so the check-in itself had no control anywhere on the
                    tab and a worker had no route to one. */}
                {canRecordData && (myCards.length > 0 ? (
                    <>
                        {/* One card per farm with a record today or still open (B.3). */}
                        {myCards.map(({ farmId: fid, card }) => {
                            const open = !!card.record && !card.record.checkOutAt;
                            const forgot = card.state === 'forgot';
                            return (
                                <ShiftCard
                                    key={fid}
                                    testID={`shift-card-${fid}`}
                                    farmName={farmName(fid) ?? ''}
                                    card={card}
                                    now={now}
                                    busy={busy}
                                    actionLabel={open ? (forgot ? t('team.fixCheckout') : t('team.checkOut')) : undefined}
                                    onAction={() =>
                                        forgot
                                            ? setSheet({ record: card.record!, farmId: fid })
                                            : confirmCheckOut(card.record!)
                                    }
                                />
                            );
                        })}
                        {checkInFarms.length > 0 && (
                            <Button
                                title={
                                    checkInFarms.length === 1 && myOpen
                                        ? t('team.switchFarm', { farm: checkInFarms[0].name })
                                        : t('team.checkInAnother')
                                }
                                variant="text"
                                onPress={() => startAction('checkin')}
                                disabled={busy}
                                style={styles.showMore}
                            />
                        )}
                    </>
                ) : (
                    <Card style={styles.checkInCard}>
                        <Icon name="schedule" size={22} color={theme.roles.light.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.checkInTitle}>{t('team.notCheckedIn')}</Text>
                            <Text style={styles.checkInSub}>{t('team.checkInSub')}</Text>
                        </View>
                        <Button
                            title={t('team.checkInCta')}
                            onPress={() => startAction('checkin')}
                            disabled={busy}
                            style={styles.checkOutBtn}
                        />
                    </Card>
                ))}

                {/* Headcount at a glance (B.5) — farms whose attendance I manage. */}
                {managedSections.length > 0 && (
                    <View testID="headcount">
                        <SectionHeader label={t('team.headcountTitle')} />
                        <Text style={styles.headcountSummary}>
                            {t('team.todayHeadcount', {
                                in: allHeadcount.in,
                                out: allHeadcount.out,
                                notIn: allHeadcount.notIn,
                                leave: allHeadcount.leave,
                                total: allHeadcount.total,
                            })}
                        </Text>
                        {managedSections.map((s) => {
                            const h = headcount(peopleOf(s.data));
                            const expanded = expandedFarm === s.farmId;
                            const summary = t('team.farmHeadcount', { in: h.in, out: h.out, notIn: h.notIn, leave: h.leave });
                            return (
                                <View key={s.farmId}>
                                    <TouchableOpacity
                                        testID={`headcount-${s.farmId}`}
                                        style={styles.farmHeadRow}
                                        onPress={() => setExpandedFarm(expanded ? null : s.farmId)}
                                        accessibilityRole="button"
                                        accessibilityState={{ expanded }}
                                        accessibilityLabel={[s.farmName, summary, h.late ? t('team.lateCount', { count: h.late }) : null].filter(Boolean).join('. ')}
                                    >
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={styles.farmRowLabel} numberOfLines={1}>{s.farmName}</Text>
                                            <Text style={styles.taskMeta}>{summary}</Text>
                                        </View>
                                        {h.late > 0 && (
                                            <View style={styles.lateTag}>
                                                <Icon name="warning" size={16} color={theme.roles.light.dangerText} />
                                                <Text style={styles.overdue}>{t('team.lateCount', { count: h.late })}</Text>
                                            </View>
                                        )}
                                        <Icon
                                            name={expanded ? 'expand_more' : 'chevron_right'}
                                            size={20}
                                            color={theme.roles.light.textSecondary}
                                        />
                                    </TouchableOpacity>
                                    {expanded &&
                                        GROUPS.map((g) => {
                                            const people = s.data.filter((e) => groupOf(e.shift!.state) === g);
                                            if (!people.length) return null;
                                            return (
                                                <View key={g}>
                                                    <Text style={styles.taskGroup}>{t(BADGE_KEY[g])}</Text>
                                                    {people.map((e) => renderPerson(e, s.farmId))}
                                                </View>
                                            );
                                        })}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Workers see WHO is in right now — names only (founder Q5). */}
                {namesOnlyFarms.length > 0 && (
                    <View testID="in-now">
                        <SectionHeader label={t('team.inNow')} />
                        {namesOnlyFarms.map((f) => {
                            const names = (presentNow ?? [])
                                .filter((p) => p.farmId === f.id)
                                .map((p) => (p.userId === userId ? t('attendance.you') : p.name));
                            return (
                                <View key={f.id} style={styles.farmHeadRow} testID={`in-now-${f.id}`}>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={styles.farmRowLabel} numberOfLines={1}>{f.name}</Text>
                                        <Text style={styles.taskMeta}>
                                            {names.length ? names.join(', ') : t('team.nobodyInNow')}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* The badge's other half. It only appears when there IS a
                    queue, and it lands on the roster where the approve and
                    decline buttons live — not on a screen that just counts. */}
                {canManage && pendingJoins > 0 && (
                    <SummaryRow
                        icon="person_add"
                        title={t('team.joins')}
                        subtitle={t('team.joinsWaiting', { count: pendingJoins })}
                        value={String(pendingJoins)}
                        tone="warning"
                        onPress={() => navigation.navigate('AllWorkers')}
                    />
                )}

                {/* Visible to everyone who can record data, not just managers.
                    Behind `canManageMembers` these two rows were a worker's
                    ONLY route to attendance and leave, and it was closed. */}
                {canRecordData && (
                    <>
                        <SummaryRow
                            icon="groups"
                            title={t('team.attendance')}
                            subtitle={
                                canManage
                                    ? t('team.checkedInCount', {
                                          count: checkedInToday,
                                          total: activeMembers.length,
                                      })
                                    : myCards.length > 0
                                      ? lineFor(myCards[0].card, now)
                                      : t('team.notCheckedIn')
                            }
                            value={canManage ? String(checkedInToday) : null}
                            unit={canManage ? `/${activeMembers.length}` : null}
                            onPress={() => startAction('attendance')}
                        />
                        {/* B.7 entry point. The collector falls back to own rows for farms not managed. */}
                        {exportOn && (
                            <Button
                                title={t('attendance.exportAttendance')}
                                variant="text"
                                onPress={() =>
                                    navigation.navigate('Export', {
                                        dataset: 'attendance',
                                        farmId: activeScope === ALL ? undefined : farmId,
                                    })
                                }
                                style={styles.showMore}
                            />
                        )}

                        <SummaryRow
                            icon="event_busy"
                            title={t('team.leave')}
                            subtitle={
                                !canManage
                                    ? myPendingLeave > 0
                                      ? t('team.leaveMineWaiting', { count: myPendingLeave })
                                      : t('team.leaveSelfSub')
                                    : pendingLeave.length > 0
                                      ? t('team.leaveWaiting', { count: pendingLeave.length })
                                      : t('team.leaveNone')
                            }
                            // Whichever number the tab badge is showing this
                            // person is the number that appears here.
                            value={
                                canManage
                                    ? pendingLeave.length > 0
                                        ? String(pendingLeave.length)
                                        : null
                                    : myPendingLeave > 0
                                      ? String(myPendingLeave)
                                      : null
                            }
                            tone={
                                (canManage ? pendingLeave.length : myPendingLeave) > 0
                                    ? 'warning'
                                    : 'default'
                            }
                            divider="strong"
                            // Leave legitimately spans farms — reviewing does
                            // not need one, and the screen picks a farm for the
                            // request form itself. This row is the reference the
                            // other three now follow.
                            onPress={() =>
                                navigation.navigate('LeaveRequests', {
                                    farmId: activeScope === ALL ? undefined : farmId,
                                    farmName: activeScope === ALL ? undefined : primaryFarm?.name,
                                })
                            }
                        />
                    </>
                )}

                {/* The roster. Everyone gets it — a worker who cannot open
                    Manage Members can still see who else is on shift today,
                    which is the whole point of a team hub. */}
                <SummaryRow
                    icon="groups"
                    title={t('team.rosterTitle')}
                    subtitle={t('team.rosterSub')}
                    value={activeMembers.length > 0 ? String(activeMembers.length) : null}
                    divider="strong"
                    onPress={() => navigation.navigate('AllWorkers')}
                />

                {/* The audit trail. Owner/manager only — it names who logged
                    what across every pond, which is a supervision view, not
                    something a worker needs to browse about their colleagues. */}
                {canManage && (
                    <SummaryRow
                        icon="history"
                        title={t('activity.title')}
                        subtitle={t('activity.teamRowSub')}
                        divider="strong"
                        onPress={() => navigation.navigate('Activity')}
                    />
                )}

                {/* Remote kill switch: the whole tasks section goes. */}
                {tasksOn && (<>
                <SectionHeader
                    label={t('team.tasksToday')}
                    actionLabel={canCreateTasks ? t('team.assign') : undefined}
                    onAction={() => startAction('assign')}
                />

                {tallies.length > 0 && (
                    <View style={styles.tallyRow}>
                        {tallies.map((x) => (
                            <Text key={x.name} style={styles.tally}>
                                {x.name} <Text style={styles.tallyNum}>{x.done}/{x.total}</Text>
                            </Text>
                        ))}
                        <View style={{ flex: 1 }} />
                        {overdue > 0 && (
                            <Text style={styles.overdue}>{t('team.overdueCount', { count: overdue })}</Text>
                        )}
                    </View>
                )}

                {tasks.length === 0 ? (
                    <EmptyState
                        icon="clipboard-check-outline"
                        title={t('team.noTasksTitle')}
                        subtitle={t('team.noTasksSub')}
                    />
                ) : (
                    <>
                        <Text style={styles.taskGroup}>{t('team.yourTasks')}</Text>
                        {myTasks.length === 0 ? (
                            <Text style={styles.taskGroupEmpty}>{t('team.yourTasksNone')}</Text>
                        ) : (
                            cut(myTasks).map((tk) => renderTask(tk, true))
                        )}

                        {/* Never anyone's personal tasks — splitTasks keeps
                            them out, and that is the point of the split. */}
                        {otherTasks.length > 0 && (
                            <>
                                <Text style={styles.taskGroup}>{t('team.othersTasks')}</Text>
                                {cut(otherTasks).map((tk) => renderTask(tk, false))}
                            </>
                        )}
                    </>
                )}

                {hiddenCount > 0 && (
                    <Button
                        title={t('team.showMoreTasks', { count: hiddenCount })}
                        variant="text"
                        onPress={() => setShowAllTasks(true)}
                        style={styles.showMore}
                    />
                )}

                {/* A daily task mints a new instance every day; without one
                    place to see the templates, stopping one means deleting
                    each day's copy forever. */}
                {canCreateTasks && (
                    <SummaryRow
                        icon="calendar_month"
                        title={t('tasks.repeatingTitle')}
                        subtitle={t('tasks.repeatingSub')}
                        divider="strong"
                        onPress={() => startAction('repeating')}
                    />
                )}
                </>)}
            </ScrollView>

            {/* Which farm? Only the ones the farmer can actually do this on. */}
            <Modal
                visible={chooserFor !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setChooserFor(null)}
            >
                <Pressable style={styles.backdrop} onPress={() => setChooserFor(null)}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <Card style={styles.sheet}>
                            <Text style={styles.sheetTitle}>{t('team.chooseFarmTitle')}</Text>
                            {chooserFarms.map((f) => (
                                <TouchableOpacity
                                    key={f.id}
                                    testID={`farm-choice-${f.id}`}
                                    style={styles.farmRow}
                                    accessibilityRole="button"
                                    accessibilityLabel={f.name}
                                    onPress={() => {
                                        const action = chooserFor;
                                        setChooserFor(null);
                                        if (action) runAction(action, f);
                                    }}
                                >
                                    <Text style={styles.farmRowLabel} numberOfLines={1}>{f.name}</Text>
                                    <Icon
                                        name="chevron_right"
                                        size={20}
                                        color={theme.roles.light.textSecondary}
                                    />
                                </TouchableOpacity>
                            ))}
                        </Card>
                    </Pressable>
                </Pressable>
            </Modal>

            <CheckOutSheet
                record={sheet?.record ?? null}
                farmName={sheet ? farmName(sheet.farmId) ?? '' : ''}
                farm={sheet ? farms.find((f) => f.id === sheet.farmId) : null}
                personName={sheet?.personName}
                onClose={() => setSheet(null)}
                onDone={() => void query.refetch()}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    loadingBlock: { gap: theme.spacing[3], padding: theme.spacing[4] },
    chips: {
        paddingHorizontal: theme.spacing[5],
        paddingTop: theme.spacing[2],
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    header: {
        flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing[3],
        paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], paddingBottom: theme.spacing[3],
        borderBottomWidth: 1, borderBottomColor: theme.roles.light.textPrimary,
    },
    eyebrow: {
        ...theme.typeScale.bodySmall, color: theme.roles.light.textTertiary,
        letterSpacing: 1.2, fontWeight: '600',
    },
    title: { ...theme.typeScale.h1, color: theme.roles.light.textPrimary },
    // Sized to its label rather than to the header, so a long translation
    // shrinks the button instead of squeezing the screen title off the row.
    manageBtn: { flexShrink: 1, maxWidth: '52%', paddingHorizontal: theme.spacing[4] },
    body: { paddingBottom: theme.spacing[8] },

    checkInCard: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3],
        padding: theme.spacing[4], margin: theme.spacing[4], marginBottom: theme.spacing[2],
        backgroundColor: theme.roles.light.infoBg,
    },
    checkInTitle: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textPrimary, fontWeight: '700' },
    checkInSub: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
    checkOutBtn: { paddingHorizontal: theme.spacing[4] },

    headcountSummary: {
        ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, fontWeight: '600',
        paddingHorizontal: theme.spacing[5], paddingBottom: theme.spacing[2],
    },
    farmHeadRow: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], flexWrap: 'wrap',
        paddingVertical: theme.spacing[3], paddingHorizontal: theme.spacing[5], minHeight: 56,
        borderTopWidth: 1, borderTopColor: theme.roles.light.surfaceVariant,
    },
    lateTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    personRow: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], flexWrap: 'wrap',
        paddingVertical: theme.spacing[2], paddingHorizontal: theme.spacing[5], minHeight: 56,
    },
    personName: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textPrimary, fontWeight: '600' },
    personRole: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, fontWeight: '400' },
    personLine: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
    personBtn: { paddingHorizontal: theme.spacing[4] },

    tallyRow: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4],
        paddingHorizontal: theme.spacing[5], paddingBottom: theme.spacing[2], flexWrap: 'wrap',
    },
    tally: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
    tallyNum: { fontWeight: '700', color: theme.roles.light.textPrimary },
    overdue: { ...theme.typeScale.bodyMedium, color: theme.roles.light.dangerText, fontWeight: '600' },

    taskRow: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3],
        paddingVertical: theme.spacing[3], paddingRight: theme.spacing[5],
        borderTopWidth: 1, borderTopColor: theme.roles.light.surfaceVariant,
        minHeight: 56,
    },
    taskBar: { width: 4, height: 40, borderRadius: 2 },
    taskGroup: {
        ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary,
        paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[3],
        paddingBottom: theme.spacing[1], textTransform: 'uppercase', letterSpacing: 0.8,
    },
    taskGroupEmpty: {
        ...theme.typeScale.bodySmall, color: theme.roles.light.textTertiary,
        paddingHorizontal: theme.spacing[5], paddingBottom: theme.spacing[2],
    },
    taskTitle: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textPrimary, fontWeight: '600' },
    taskMeta: { ...theme.typeScale.bodySmall, color: theme.roles.light.textTertiary },
    showMore: { alignSelf: 'flex-start', marginHorizontal: theme.spacing[4], marginTop: theme.spacing[2] },

    backdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center', padding: theme.spacing[5],
    },
    sheet: { padding: theme.spacing[4], gap: theme.spacing[1] },
    sheetTitle: {
        ...theme.typeScale.h3, color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[2],
    },
    farmRow: {
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3],
        paddingVertical: theme.spacing[3], minHeight: 48,
        borderTopWidth: 1, borderTopColor: theme.roles.light.surfaceVariant,
    },
    farmRowLabel: {
        ...theme.typeScale.bodyLarge, flex: 1, minWidth: 0,
        color: theme.roles.light.textPrimary, fontWeight: '600',
    },
});

export default TeamScreen;
