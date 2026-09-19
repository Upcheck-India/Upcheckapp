// Spec 2026-09-14 attendance B.3–B.6: one shift card per farm, a confirm that
// names the farm, the headcount for managers, names-only for workers (Q5), and
// an older backend that sends none of the new fields.
jest.mock('../../../api/attendance', () => ({
    attendanceApi: { mine: jest.fn(), getAll: jest.fn(), checkOut: jest.fn() },
}));
jest.mock('../../../api/teamOverview', () => ({
    ...jest.requireActual('../../../api/teamOverview'),
    fetchTeamOverview: jest.fn(),
}));
jest.mock('../../../sync/recordSync', () => ({
    saveRecord: jest.fn(),
    drainRecordQueue: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual('@react-navigation/native');
    return {
        ...actual,
        useFocusEffect: (effect: () => void) => {
            const React = require('react');
            React.useEffect(effect, [effect]);
        },
    };
});

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TeamScreen } from '../TeamScreen';
import { attendanceApi } from '../../../api/attendance';
import { fetchTeamOverview } from '../../../api/teamOverview';
import { saveRecord } from '../../../sync/recordSync';
import { useActiveFarmStore } from '../../../store/activeFarmStore';
import { useMembershipStore } from '../../../store/membershipStore';
import { useAuthStore } from '../../../store/authStore';

const KOVALAM = { id: 'farm-1', name: 'Kovalam East' };
const PULICAT = { id: 'farm-2', name: 'Pulicat' };
const navigation = { navigate: jest.fn() };

const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const rec = (over: any) => ({ userId: 'me', checkOutAt: null, createdAt: '', ...over });
const person = (userId: string, firstName: string, farmId: string, role = 'worker') => ({
    id: `m-${userId}-${farmId}`, userId, farmId, role, status: 'active',
    user: { id: userId, firstName, lastName: null },
});

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
            <TeamScreen navigation={navigation} />
        </SafeAreaProvider>,
    );

const as = (role: string) =>
    useMembershipStore.setState({
        memberships: [
            { farmId: 'farm-1', role, farm: KOVALAM },
            { farmId: 'farm-2', role, farm: PULICAT },
        ],
        loaded: true, loading: false,
    } as any);

const overview = (over: any = {}) => ({
    farms: [KOVALAM, PULICAT],
    myAttendance: null,
    allAttendance: [],
    pendingLeave: [],
    tasks: [],
    members: [],
    ...over,
});

beforeEach(() => {
    jest.clearAllMocks();
    useActiveFarmStore.setState({ selectedFarm: KOVALAM } as any);
    useAuthStore.setState({ user: { id: 'me' } } as any);
    (attendanceApi.checkOut as jest.Mock).mockResolvedValue({ data: {} });
    (saveRecord as jest.Mock).mockResolvedValue({ queued: false });
});

describe('My shift — one card per farm', () => {
    beforeEach(() => as('worker'));

    it('renders each farm with its state; check-out confirm names the farm and shows errors', async () => {
        const open = rec({ id: 'r1', farmId: 'farm-1', checkInAt: minsAgo(10) });
        const forgot = rec({ id: 'r2', farmId: 'farm-2', checkInAt: minsAgo(48 * 60) });
        (fetchTeamOverview as jest.Mock).mockResolvedValue(overview({ myOpen: [open, forgot], myToday: [open], presentNow: [] }));
        (attendanceApi.checkOut as jest.Mock).mockRejectedValue({ response: { status: 409, data: { message: 'Already checked out' } } });
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        const { findByTestId } = renderScreen();
        const kovalam = await findByTestId('shift-card-farm-1');
        expect(within(kovalam).getByText('Kovalam East')).toBeTruthy();
        expect(within(kovalam).getByText('Just in')).toBeTruthy();
        const pulicat = await findByTestId('shift-card-farm-2');
        expect(within(pulicat).getByText('Not checked out')).toBeTruthy();
        expect(within(pulicat).getByText('Fix check-out time')).toBeTruthy();

        fireEvent.press(within(kovalam).getByText('Check out'));
        expect(alert.mock.calls[0][0]).toBe('Check out of Kovalam East?');
        // Confirm.
        await (alert.mock.calls[0][2] as any)[1].onPress();
        expect(attendanceApi.checkOut).toHaveBeenCalledWith('r1');
        // The error is shown, not swallowed.
        await waitFor(() => expect(alert.mock.calls.some((c) => c[1] === 'Already checked out')).toBe(true));
    });

    it('offers "Switch to <farm>" and explains the auto check-out before checking in', async () => {
        const open = rec({ id: 'r1', farmId: 'farm-1', checkInAt: minsAgo(120) });
        (fetchTeamOverview as jest.Mock).mockResolvedValue(overview({ myOpen: [open], myToday: [open], presentNow: [] }));
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        const { findByText } = renderScreen();
        fireEvent.press(await findByText('Switch to Pulicat'));

        expect(alert.mock.calls[0][0]).toBe('Switch to Pulicat');
        expect(alert.mock.calls[0][1]).toMatch(/^You're checked in at Kovalam East since .+\. We'll check you out there\.$/);
        expect(saveRecord).not.toHaveBeenCalled();
        (alert.mock.calls[0][2] as any)[1].onPress();
        await waitFor(() => expect((saveRecord as jest.Mock).mock.calls[0][0].payload.farmId).toBe('farm-2'));
    });

    it('older backend: no myOpen/myToday — the card comes from myAttendance', async () => {
        const open = rec({ id: 'r1', farmId: 'farm-2', checkInAt: minsAgo(90) });
        (fetchTeamOverview as jest.Mock).mockResolvedValue(overview({ myAttendance: open }));

        const { findByTestId, queryByTestId } = renderScreen();
        const card = await findByTestId('shift-card-farm-2');
        expect(within(card).getByText('On shift')).toBeTruthy();
        // No presentNow → no names section, and nobody is called "Not in".
        expect(queryByTestId('in-now')).toBeNull();
    });
});

describe('Workers see who is in now — names only (Q5)', () => {
    beforeEach(() => as('worker'));

    it('lists names per farm from presentNow, with no times and no actions', async () => {
        (fetchTeamOverview as jest.Mock).mockResolvedValue(
            overview({
                myOpen: [],
                myToday: [],
                presentNow: [
                    { farmId: 'farm-1', userId: 'u1', name: 'Suresh' },
                    { farmId: 'farm-1', userId: 'u2', name: 'Anita' },
                ],
            }),
        );

        const { findByTestId, queryByTestId } = renderScreen();
        const k = await findByTestId('in-now-farm-1');
        expect(within(k).getByText('Suresh, Anita')).toBeTruthy();
        expect(within(await findByTestId('in-now-farm-2')).getByText('Nobody checked in yet')).toBeTruthy();
        expect(within(k).queryByText(/\d{2}:\d{2}|min|Check out/)).toBeNull();
        expect(queryByTestId('headcount')).toBeNull();
    });
});

describe('Headcount and manager check-out (B.5/B.6)', () => {
    beforeEach(() => as('owner'));

    it('summarises all farms deduped, expands a farm, and checks a member out with time + reason', async () => {
        const suresh = rec({ id: 's1', userId: 'u1', farmId: 'farm-1', checkInAt: minsAgo(120), user: { id: 'u1', firstName: 'Suresh' } });
        (fetchTeamOverview as jest.Mock).mockResolvedValue(
            overview({
                myOpen: [],
                myToday: [],
                presentNow: [],
                allAttendance: [suresh],
                // Suresh works both farms: one person in the all-farms total.
                members: [person('u1', 'Suresh', 'farm-1'), person('u1', 'Suresh', 'farm-2'), person('u2', 'Anita', 'farm-1')],
            }),
        );

        const { findByText, findByTestId, getByText, getAllByText } = renderScreen();
        expect(await findByText('1 in · 0 out · 1 not in · 0 on leave (of 2)')).toBeTruthy();

        fireEvent.press(await findByTestId('headcount-farm-1'));
        const row = await findByTestId('person-farm-1-u1');
        fireEvent.press(within(row).getByText('Check out'));

        expect(await findByText('Check out Suresh — Kovalam East')).toBeTruthy();
        // A reason is required (CheckOutSheet.test covers the disabled state and the time bounds).
        fireEvent.press(getByText('Forgot'));
        const before = Date.now();
        // The sheet's button renders last (the row's is behind the modal).
        const buttons = getAllByText('Check out');
        fireEvent.press(buttons[buttons.length - 1]);
        await waitFor(() => expect(attendanceApi.checkOut).toHaveBeenCalled());
        const [id, body] = (attendanceApi.checkOut as jest.Mock).mock.calls[0];
        expect(id).toBe('s1');
        expect(body.reason).toBe('forgot');
        expect(Math.abs(Date.parse(body.checkOutAt) - before)).toBeLessThan(60_000);
    });
});
