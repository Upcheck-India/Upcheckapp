// BANNED-1 write-time flag — visible half. The backend now stamps every
// treatment record with a server-evaluated flag at write time; this locks in
// that the history screen actually surfaces it to the farmer (and doesn't
// show a phantom banner on clean records).
jest.mock('../../../../api/treatments', () => ({
    treatmentsApi: { getAll: jest.fn(), getByCrop: jest.fn() },
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
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TreatmentHistoryScreen } from '../TreatmentHistoryScreen';
import { treatmentsApi } from '../../../../api/treatments';

const mockedGetByCrop = treatmentsApi.getByCrop as jest.Mock;

// See src/screens/inventory/__tests__/InventoryListScreen.test.tsx for why:
// react-native-safe-area-context's initialWindowMetrics is statically null
// outside a native runtime, so SafeAreaProvider needs explicit fake metrics.
const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const route = { params: { pondId: 'pond-1', pondName: 'Pond 1', cropId: 'crop-1' } };

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <TreatmentHistoryScreen route={route} navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('TreatmentHistoryScreen — banned-substance flag badge', () => {
    beforeEach(() => jest.clearAllMocks());

    it('shows a "Flagged" banner naming the matched substance on a banned record', async () => {
        mockedGetByCrop.mockResolvedValue({
            data: [{
                id: 't-1', cropId: 'crop-1', treatmentDate: '2026-06-17T00:00:00.000Z',
                description: 'Applied colistin', createdAt: '2026-06-17T00:00:00.000Z',
                bannedSubstanceFlag: 'banned', bannedSubstanceMatches: ['Colistin'],
            }],
        });

        const { findByText } = renderScreen();
        expect(await findByText('Flagged: Colistin')).toBeTruthy();
    });

    it('shows no flag banner on a clean record', async () => {
        mockedGetByCrop.mockResolvedValue({
            data: [{
                id: 't-2', cropId: 'crop-1', treatmentDate: '2026-06-17T00:00:00.000Z',
                description: 'Applied probiotics', createdAt: '2026-06-17T00:00:00.000Z',
                bannedSubstanceFlag: 'none', bannedSubstanceMatches: [],
            }],
        });

        const { findByText, queryByText } = renderScreen();
        await findByText('Applied probiotics');
        expect(queryByText(/Flagged:/)).toBeNull();
    });
});
