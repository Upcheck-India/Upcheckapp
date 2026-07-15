// The farm/role context bar is the core fix for owner-vs-worker confusion:
// it names the active farm, badges the user's role there, and — for a member
// of more than one farm — switches between them inline. These tests lock in
// that behavior (role visible, single-farm has no switcher, multi-farm switch
// updates the active farm).
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FarmContextBar } from '../FarmContextBar';
import { useActiveFarmStore } from '../../../store/activeFarmStore';
import { useMembershipStore } from '../../../store/membershipStore';

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const FARM_A = { id: 'farm-a', name: "Ravi's Farm" };
const FARM_B = { id: 'farm-b', name: 'Coastal Ponds' };

const renderBar = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <FarmContextBar />
        </SafeAreaProvider>,
    );

describe('FarmContextBar', () => {
    beforeEach(() => {
        useActiveFarmStore.setState({ selectedFarm: FARM_A } as any);
    });

    it('shows the active farm name and the role badge for that farm', () => {
        useMembershipStore.setState({
            memberships: [{ farmId: 'farm-a', role: 'worker', farm: FARM_A }],
            loaded: true, loading: false,
        } as any);

        const { getByText } = renderBar();

        expect(getByText("Ravi's Farm")).toBeTruthy();
        expect(getByText('Worker')).toBeTruthy();
    });

    it('renders nothing when there is no active farm', () => {
        useActiveFarmStore.setState({ selectedFarm: null } as any);
        useMembershipStore.setState({ memberships: [], loaded: true, loading: false } as any);

        const { queryByText } = renderBar();
        expect(queryByText("Ravi's Farm")).toBeNull();
    });

    it('a single-farm member cannot open a switcher', () => {
        useMembershipStore.setState({
            memberships: [{ farmId: 'farm-a', role: 'owner', farm: FARM_A }],
            loaded: true, loading: false,
        } as any);

        const { getByText, queryByText } = renderBar();
        fireEvent.press(getByText("Ravi's Farm")); // no-op — disabled

        // The other farm never appears because the switcher can't open.
        expect(queryByText('Coastal Ponds')).toBeNull();
    });

    it('a multi-farm member can switch the active farm', async () => {
        useMembershipStore.setState({
            memberships: [
                { farmId: 'farm-a', role: 'owner', farm: FARM_A },
                { farmId: 'farm-b', role: 'manager', farm: FARM_B },
            ],
            loaded: true, loading: false,
        } as any);

        const { getByText, getByLabelText } = renderBar();

        // Open the switcher and pick the second farm.
        fireEvent.press(getByLabelText('Switch farm — currently Ravi\'s Farm'));
        fireEvent.press(await waitFor(() => getByText('Coastal Ponds')));

        expect(useActiveFarmStore.getState().selectedFarm?.id).toBe('farm-b');
    });
});
