// M2: the pre-harvest check sits above the grades and WARNS ONLY — a red
// residues line never blocks the save (standing owner decision).
jest.mock('../../../api/harvests', () => ({
    harvestsApi: { update: jest.fn(), create: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../../api/ponds', () => ({
    pondsApi: { getById: jest.fn().mockResolvedValue({ data: { id: 'pond-1', farmId: 'farm-1' } }) },
}));
jest.mock('../../../api/crops', () => ({
    ...jest.requireActual('../../../api/crops'),
    cropsApi: { getById: jest.fn().mockResolvedValue({ data: { id: 'crop-1', stockingDate: '2026-06-03' } }) },
}));
jest.mock('../../../api/pondContext', () => ({
    pondContextApi: { get: jest.fn().mockResolvedValue({ data: {} }) },
}));
jest.mock('../../../sync/recordSync', () => ({
    saveRecord: jest.fn(),
    drainRecordQueue: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../api/molt', () => ({ moltApi: { windows: jest.fn().mockResolvedValue({ data: [] }) } }));
jest.mock('../../../api/healthObservations', () => ({
    ...jest.requireActual('../../../api/healthObservations'),
    healthObservationsApi: { listForPond: jest.fn().mockResolvedValue({ data: [] }), save: jest.fn() },
}));
jest.mock('../../../api/treatments', () => ({
    treatmentsApi: {
        compliance: jest.fn().mockResolvedValue({
            data: { status: 'banned_logged', items: [{ date: '2026-08-12', source: 'treatment', recordId: 'r', substances: ['Chloramphenicol'], flag: 'banned' }] },
        }),
    },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-1' }));
jest.mock('../../../hooks/usePermissions', () => ({ usePermissions: () => ({ canViewFinancials: true }) }));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HarvestLogScreen } from '../HarvestLogScreen';
import { saveRecord } from '../../../sync/recordSync';

const METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

it('shows a red residues line and still saves the harvest', async () => {
    (saveRecord as jest.Mock).mockResolvedValue({ id: 'uuid-1', queued: false });
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[buttons.length - 1]?.onPress?.());
    const { findByTestId, getByText, getAllByLabelText } = render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <HarvestLogScreen
                route={{ params: { pondId: 'pond-1', pondName: 'Pond 1', cropId: 'crop-1', harvestType: 'partial' } }}
                navigation={{ goBack: jest.fn(), replace: jest.fn() }}
            />
        </SafeAreaProvider>,
    );

    await findByTestId('check-residues-red');
    fireEvent.changeText(getAllByLabelText('kg')[0], '100');
    fireEvent.press(getByText('Save Harvest'));

    await waitFor(() => expect(saveRecord).toHaveBeenCalled());
});
