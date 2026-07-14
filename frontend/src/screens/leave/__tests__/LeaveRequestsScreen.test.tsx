jest.mock('../../../api/leaveRequests', () => ({
    leaveRequestsApi: { mine: jest.fn(), getAll: jest.fn(), approve: jest.fn(), reject: jest.fn() },
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
            React.useEffect(effect, []);
        },
    };
});

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LeaveRequestsScreen } from '../LeaveRequestsScreen';
import { leaveRequestsApi } from '../../../api/leaveRequests';
import { saveRecord } from '../../../sync/recordSync';
import { useMembershipStore } from '../../../store/membershipStore';

const mockedMine = leaveRequestsApi.mine as jest.Mock;
const mockedGetAll = leaveRequestsApi.getAll as jest.Mock;
const mockedApprove = leaveRequestsApi.approve as jest.Mock;
const mockedSaveRecord = saveRecord as jest.Mock;

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const navigation = { goBack: jest.fn() };

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <LeaveRequestsScreen navigation={navigation} route={{ params: { farmId: 'farm-1', farmName: "Ravi's Farm" } }} />
        </SafeAreaProvider>,
    );

describe('LeaveRequestsScreen — worker submit + manager approve (#51)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    it('submits a leave request via the offline sync queue', async () => {
        useMembershipStore.setState({
            memberships: [{ farmId: 'farm-1', role: 'worker', farm: { id: 'farm-1', name: "Ravi's Farm" } }],
            loaded: true, loading: false,
        } as any);
        mockedMine.mockResolvedValue({ data: [] });
        mockedSaveRecord.mockResolvedValue({ id: 'req-1', queued: false });

        const { findByText } = renderScreen();
        fireEvent.press(await findByText('Submit request'));

        await waitFor(() => expect(mockedSaveRecord).toHaveBeenCalledWith(
            expect.objectContaining({ entity: 'leave_request', endpoint: '/leave-requests' }),
        ));
    });

    it("does not show pending approvals to a plain worker", async () => {
        useMembershipStore.setState({
            memberships: [{ farmId: 'farm-1', role: 'worker', farm: { id: 'farm-1', name: "Ravi's Farm" } }],
            loaded: true, loading: false,
        } as any);
        mockedMine.mockResolvedValue({ data: [] });

        const { queryByText, findByText } = renderScreen();
        await findByText('My requests');

        expect(queryByText('Pending approvals')).toBeNull();
        expect(mockedGetAll).not.toHaveBeenCalled();
    });

    it('shows pending approvals for a manager and approves one', async () => {
        useMembershipStore.setState({
            memberships: [{ farmId: 'farm-1', role: 'manager', farm: { id: 'farm-1', name: "Ravi's Farm" } }],
            loaded: true, loading: false,
        } as any);
        mockedMine.mockResolvedValue({ data: [] });
        mockedGetAll.mockResolvedValue({
            data: [{ id: 'req-1', farmId: 'farm-1', userId: 'worker-1', startDate: '2026-08-01', endDate: '2026-08-03', reason: null, status: 'pending', decidedById: null, decidedAt: null, createdAt: '2026-07-01T00:00:00.000Z' }],
        });
        mockedApprove.mockResolvedValue({ data: {} });

        const { findByText, findByLabelText } = renderScreen();
        await findByText('Pending approvals');
        fireEvent.press(await findByLabelText('Approve'));

        await waitFor(() => expect(mockedApprove).toHaveBeenCalledWith('req-1'));
    });
});
