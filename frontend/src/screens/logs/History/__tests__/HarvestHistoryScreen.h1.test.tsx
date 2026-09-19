// H1: history rows read like the buyer's slip, carry a per-cycle subtotal,
// and edit / add are RECORD_HARVEST actions — with the FAB explaining itself
// when the pond has no active cycle.
jest.mock('../../../../api/harvests', () => ({
    harvestsApi: { getByCrop: jest.fn(), getByPond: jest.fn() },
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
const mockPerms = { canRecordHarvest: true };
jest.mock('../../../../hooks/usePermissions', () => ({ usePermissions: () => mockPerms }));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HarvestHistoryScreen } from '../HarvestHistoryScreen';
import { harvestsApi } from '../../../../api/harvests';

const METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const renderWith = (params: any) =>
    render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <HarvestHistoryScreen route={{ params }} navigation={navigation} />
        </SafeAreaProvider>,
    );

const graded = {
    id: 'h2', cropId: 'c1', harvestDate: '2026-09-10', weightKg: 980, salePriceTotal: 407000,
    harvestType: 'full', status: 'sold', createdAt: '', updatedAt: '',
    grades: [
        { id: 'g1', weightKg: 820, countPerKg: 40, pricePerKg: 430 },
        { id: 'g2', weightKg: 160, countPerKg: 55, pricePerKg: 340 },
    ],
};
const old = {
    id: 'h1', cropId: 'c1', harvestDate: '2026-08-01', weightKg: 200, salePriceTotal: 80000,
    averageSize: 20, harvestType: 'partial', status: 'sold', createdAt: '', updatedAt: '', grades: [],
};

beforeEach(() => {
    jest.clearAllMocks();
    mockPerms.canRecordHarvest = true;
    (harvestsApi.getByPond as jest.Mock).mockResolvedValue({ data: [old, graded] });
});

it('rows show kg · grades · avg count, with a per-cycle subtotal', async () => {
    const { findByText, getByText } = renderWith({ pondId: 'p1', pondName: 'Pond 1', cropId: 'c1' });
    await findByText('980 kg · Grades: 2 · avg 42/kg');
    // An old ungraded row: count implied by its g/piece.
    expect(getByText('200 kg · avg 50/kg')).toBeTruthy();
    expect(getByText('Cycle total: 1,180 kg · ₹4,87,000')).toBeTruthy();
});

it('hides edit and add without RECORD_HARVEST', async () => {
    mockPerms.canRecordHarvest = false;
    const { findByText, queryByLabelText } = renderWith({ pondId: 'p1', cropId: 'c1' });
    await findByText('980 kg · Grades: 2 · avg 42/kg');
    expect(queryByLabelText('Edit')).toBeNull();
    expect(queryByLabelText('Add')).toBeNull();
});

it('with no active cycle the FAB explains instead of opening the form', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { findByLabelText } = renderWith({ pondId: 'p1' });
    fireEvent.press(await findByLabelText('No active cycle — start one to log a harvest.'));
    expect(alert).toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
});
