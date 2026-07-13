// #37 — Home's dashboard summary reads useActiveFarmStore's selectedFarm,
// but until now the only places that ever set it were Home/Inventory's own
// "nothing selected yet, default to the first farm" fallback. A multi-farm
// owner who opened a specific farm directly (e.g. to start a cycle on one of
// its ponds) would return to Home still summarizing whatever farm was first
// auto-selected — showing "0 active/total ponds" for an unrelated farm while
// the pond they were just looking at clearly had an active cycle. This locks
// in that opening a farm's detail screen syncs the active-farm store to it.
jest.mock('../../../api/ponds', () => ({
    pondsApi: { getAll: jest.fn() },
}));
// See src/screens/inventory/__tests__/InventoryListScreen.test.tsx for why:
// useFocusEffect needs a NavigationContainer the plain SafeAreaProvider
// wrapper below doesn't provide.
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
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FarmDetailScreen } from '../FarmDetailScreen';
import { pondsApi } from '../../../api/ponds';
import { useActiveFarmStore } from '../../../store/activeFarmStore';
import { useMembershipStore } from '../../../store/membershipStore';

const mockedGetAll = pondsApi.getAll as jest.Mock;

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

const renderScreen = (farmId: string, farmName: string) =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <FarmDetailScreen navigation={navigation} route={{ params: { farmId, farmName } }} />
        </SafeAreaProvider>,
    );

describe('FarmDetailScreen — syncs the active-farm store on open (#37)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useActiveFarmStore.setState({ selectedFarm: null } as any);
        useMembershipStore.setState({ memberships: [], loaded: true, loading: false } as any);
        mockedGetAll.mockResolvedValue({ data: { data: [] } });
    });

    it('sets useActiveFarmStore.selectedFarm to the farm being viewed', () => {
        renderScreen('farm-2', 'South Site');

        expect(useActiveFarmStore.getState().selectedFarm).toEqual({ id: 'farm-2', name: 'South Site' });
    });

    it('re-syncs to a DIFFERENT farm when navigated to a second one (e.g. via goBack + reopen)', () => {
        const { unmount } = renderScreen('farm-1', "Ravi's Farm");
        expect(useActiveFarmStore.getState().selectedFarm?.id).toBe('farm-1');
        unmount();

        renderScreen('farm-2', 'South Site');
        expect(useActiveFarmStore.getState().selectedFarm).toEqual({ id: 'farm-2', name: 'South Site' });
    });
});
