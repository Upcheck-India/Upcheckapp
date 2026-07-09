// Regression test for the historically broken "Mark Complete" flow (audit row
// #28): `promptCompleteValues` promised the farmer would be asked for actual
// harvest weight/price, but the flow didn't actually collect or send them —
// completing a plan is how the season's most important event (getting paid)
// gets recorded, so a silent no-op or a booked 0/0 here is the worst possible
// failure mode.
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
        complete: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
    },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HarvestPlansScreen } from '../HarvestPlansScreen';
import { harvestPlansApi } from '../../../api/harvestPlans';

const mockedGetAll = harvestPlansApi.getAll as jest.Mock;
const mockedComplete = harvestPlansApi.complete as jest.Mock;

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

describe('HarvestPlansScreen — Mark Complete (regression for the broken-flow bug)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetAll.mockResolvedValue({ data: [PLANNED_PLAN] });
    });

    it('collects real actual weight/price and books them — never a silent no-op or 0/0', async () => {
        mockedComplete.mockResolvedValue({ data: { ...PLANNED_PLAN, status: 'completed' } });

        const { getByText, getByPlaceholderText } = renderScreen();
        await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(1));

        // Tap "Mark Complete" on the plan card — this used to promise a
        // weight/price prompt that never actually materialized.
        fireEvent.press(getByText('Mark Complete'));

        // The modal must actually collect real numbers, not auto-book 0/0.
        fireEvent.changeText(getByPlaceholderText('e.g. 480'), '470');
        fireEvent.changeText(getByPlaceholderText('e.g. 290'), '300');
        fireEvent.press(getByText('Complete'));

        await waitFor(() =>
            expect(mockedComplete).toHaveBeenCalledWith(
                'plan-1',
                expect.objectContaining({
                    actualWeightKg: 470,
                    actualPricePerKg: 300,
                    farmId: 'farm-1',
                    cropId: 'crop-1',
                }),
            ),
        );
        // A real completion must refresh the list so the plan's new status/
        // actuals are visible — not just close the modal on stale data.
        await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(2));
    });

    it('refuses to complete with a zero/blank weight or price — never books 0/0', async () => {
        const { getByText } = renderScreen();
        await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(1));

        fireEvent.press(getByText('Mark Complete'));
        // Leave both fields blank/zero and try to submit anyway.
        fireEvent.press(getByText('Complete'));

        await waitFor(() => expect(mockedComplete).not.toHaveBeenCalled());
    });
});
