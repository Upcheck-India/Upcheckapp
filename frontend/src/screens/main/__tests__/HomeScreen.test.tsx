// Task 7 — finish-setup nudge on Home. An owner who bailed out of onboarding
// pond setup early (via "Finish Later" or backing out mid-loop) already lands
// on a real dashboard (not gated), but shouldn't silently forget the rest of
// their planned ponds. This locks in the nudge: shown while incomplete,
// dismissible per-visit, gone once the pond count matches the plan.
jest.mock('../../../api/farms', () => ({
    farmsApi: { getAll: jest.fn(), getById: jest.fn() },
}));
jest.mock('../../../api/ponds', () => ({
    pondsApi: { getMine: jest.fn() },
}));
jest.mock('../../../api/reports', () => ({
    reportsApi: { getDashboardSummary: jest.fn() },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from '../HomeScreen';
import { farmsApi } from '../../../api/farms';
import { pondsApi } from '../../../api/ponds';
import { reportsApi } from '../../../api/reports';
import { useActiveFarmStore } from '../../../store/activeFarmStore';

const mockedGetAll = farmsApi.getAll as jest.Mock;
const mockedGetById = farmsApi.getById as jest.Mock;
const mockedGetMine = pondsApi.getMine as jest.Mock;
const mockedDashboard = reportsApi.getDashboardSummary as jest.Mock;

// See src/screens/inventory/__tests__/InventoryListScreen.test.tsx for why:
// react-native-safe-area-context's initialWindowMetrics is statically null
// outside a native runtime, so SafeAreaProvider needs explicit fake metrics.
const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { navigate: jest.fn(), getParent: () => undefined };
const FARM = { id: 'farm-1', name: "Ravi's Farm" };

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <HomeScreen navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('HomeScreen — finish-setup nudge', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useActiveFarmStore.setState({ selectedFarm: FARM } as any);
        mockedGetAll.mockResolvedValue({ data: [FARM] });
        mockedDashboard.mockResolvedValue({
            data: { activePondsCount: 1, totalPondsCount: 1, lowStockAlerts: 0, todayFeedUsage: 0 },
        });
    });

    it('shows the nudge with the correct remaining count when fewer ponds exist than planned', async () => {
        mockedGetById.mockResolvedValue({ data: { ...FARM, plannedPondCount: 3 } });
        mockedGetMine.mockResolvedValue({ data: [{ id: 'p1', farmId: 'farm-1' }] }); // 1 of 3 set up

        const { findByText } = renderScreen();

        expect(await findByText('Finish setting up your ponds')).toBeTruthy();
        expect(await findByText('2 more pond(s) planned but not set up yet.')).toBeTruthy();
    });

    it('does not show the nudge once every planned pond is set up', async () => {
        mockedGetById.mockResolvedValue({ data: { ...FARM, plannedPondCount: 2 } });
        mockedGetMine.mockResolvedValue({
            data: [{ id: 'p1', farmId: 'farm-1' }, { id: 'p2', farmId: 'farm-1' }],
        });

        const { queryByText, findByText } = renderScreen();
        await findByText('Active Ponds'); // wait for the dashboard to settle

        expect(queryByText('Finish setting up your ponds')).toBeNull();
    });

    it('dismisses for this visit without navigating anywhere', async () => {
        mockedGetById.mockResolvedValue({ data: { ...FARM, plannedPondCount: 3 } });
        mockedGetMine.mockResolvedValue({ data: [{ id: 'p1', farmId: 'farm-1' }] });

        const { findByText, findByLabelText, queryByText } = renderScreen();
        await findByText('Finish setting up your ponds');

        fireEvent.press(await findByLabelText('Dismiss'));

        await waitFor(() => expect(queryByText('Finish setting up your ponds')).toBeNull());
        expect(navigation.navigate).not.toHaveBeenCalled();
    });

    it('"Continue setup" navigates to PondSetup with only the remaining count', async () => {
        mockedGetById.mockResolvedValue({ data: { ...FARM, plannedPondCount: 3 } });
        mockedGetMine.mockResolvedValue({ data: [{ id: 'p1', farmId: 'farm-1' }] });

        const { findByText } = renderScreen();
        const cta = await findByText('Continue setup');
        fireEvent.press(cta);

        expect(navigation.navigate).toHaveBeenCalledWith('PondSetup', { farmId: 'farm-1', totalPonds: 2 });
    });
});
