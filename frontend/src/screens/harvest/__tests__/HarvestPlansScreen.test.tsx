// H4 — one revenue path. "Mark complete" used to PATCH /complete, which
// booked a transaction and wrote no harvest. It now opens HarvestLog
// prefilled from the plan; the harvest save completes the plan server-side.
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
jest.mock('../../../api/harvestPlans', () => ({
    harvestPlansApi: {
        getAll: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
    },
}));
const permissions = { canRecordHarvest: true };
jest.mock('../../../hooks/usePermissions', () => ({ usePermissions: () => permissions }));
jest.mock('../../../api/molt', () => ({ moltApi: { windows: jest.fn().mockResolvedValue({ data: [] }) } }));
jest.mock('../../../components/harvest/PreHarvestCheck', () => ({
    PreHarvestCheck: ({ date }: { date: string }) => {
        const { Text } = require('react-native');
        return <Text>{`CHECK ${date}`}</Text>;
    },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HarvestPlansScreen, showsPreHarvestCheck } from '../HarvestPlansScreen';
import { harvestPlansApi } from '../../../api/harvestPlans';

const mockedGetAll = harvestPlansApi.getAll as jest.Mock;
const mockedCreate = harvestPlansApi.create as jest.Mock;

// See src/screens/inventory/__tests__/InventoryListScreen.test.tsx for why
// this is needed: react-native-safe-area-context's real initialWindowMetrics
// is statically null outside a native runtime, so SafeAreaProvider never
// renders children without explicit fake metrics.
const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const PLANNED_PLAN = {
    id: 'plan-1',
    pondId: 'pond-1',
    cropId: 'crop-1',
    plannedHarvestDate: '2026-08-01',
    targetWeightKg: 500,
    expectedPricePerKg: 280,
    status: 'planned',
    createdAt: '2026-07-01T00:00:00.000Z',
};

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <HarvestPlansScreen
                route={{ params: { pondId: 'pond-1', pondName: 'Pond 1', cropId: 'crop-1', farmId: 'farm-1' } }}
                navigation={navigation}
            />
        </SafeAreaProvider>,
    );

describe('HarvestPlansScreen — H4', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        permissions.canRecordHarvest = true;
        mockedGetAll.mockResolvedValue({ data: [PLANNED_PLAN] });
    });

    it('"Mark Complete" opens the harvest form prefilled from the plan — no /complete call', async () => {
        const { getByText } = renderScreen();
        await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(1));

        fireEvent.press(getByText('Mark Complete'));

        expect(navigation.navigate).toHaveBeenCalledWith('HarvestLog', {
            pondId: 'pond-1',
            pondName: 'Pond 1',
            cropId: 'crop-1',
            farmId: 'farm-1',
            planId: 'plan-1',
            harvestType: 'full',
            prefill: { date: '2026-08-01', targetKg: 500, expectedPrice: 280 },
        });
    });

    it('hides complete and delete without RECORD_HARVEST', async () => {
        permissions.canRecordHarvest = false;
        const { queryByText } = renderScreen();
        await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(1));

        expect(queryByText('Mark Complete')).toBeNull();
    });

    it('sends expectedRevenue = target kg × expected price on create', async () => {
        mockedGetAll.mockResolvedValue({ data: [] });
        mockedCreate.mockResolvedValue({ data: {} });
        const { getByText, getByPlaceholderText } = renderScreen();
        await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(1));

        fireEvent.press(getByText('Add Plan'));
        fireEvent.changeText(getByPlaceholderText('e.g. 500'), '500');
        fireEvent.changeText(getByPlaceholderText('e.g. 280'), '280');
        fireEvent.press(getByText('Add Plan'));

        await waitFor(() =>
            expect(mockedCreate).toHaveBeenCalledWith(
                expect.objectContaining({ targetWeightKg: 500, expectedPricePerKg: 280, expectedRevenue: 140000 }),
            ),
        );
    });
});

describe('HarvestPlansScreen — M2 pre-harvest check on the plan card', () => {
    const plan = (over: any = {}) => ({ ...PLANNED_PLAN, ...over }) as any;

    it('appears from 2 days before the planned date, only on planned plans', () => {
        expect(showsPreHarvestCheck(plan({ plannedHarvestDate: '2026-10-05' }), '2026-10-02')).toBe(false);
        expect(showsPreHarvestCheck(plan({ plannedHarvestDate: '2026-10-05' }), '2026-10-03')).toBe(true);
        expect(showsPreHarvestCheck(plan({ plannedHarvestDate: '2026-10-05T00:00:00.000Z' }), '2026-10-05')).toBe(true);
        expect(showsPreHarvestCheck(plan({ plannedHarvestDate: '2026-10-05', status: 'completed' }), '2026-10-04')).toBe(false);
    });

    it('renders on a due card and not on a far-off one', async () => {
        mockedGetAll.mockResolvedValue({
            data: [PLANNED_PLAN, plan({ id: 'plan-2', plannedHarvestDate: '2099-01-01' })],
        });
        const { findByText, queryByText } = renderScreen();
        expect(await findByText('CHECK 2026-08-01')).toBeTruthy();
        expect(queryByText('CHECK 2099-01-01')).toBeNull();
    });
});
