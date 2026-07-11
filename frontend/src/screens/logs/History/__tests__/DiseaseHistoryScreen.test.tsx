// BANNED-1 write-time flag — visible half, disease-record side. Mirrors
// TreatmentHistoryScreen.test.tsx: the backend now stamps every disease
// occurrence record with a server-evaluated flag at write time; this locks
// in that the history screen surfaces it (and stays quiet on clean records).
jest.mock('../../../../api/diseases', () => ({
    diseaseApi: { getByCrop: jest.fn(), remove: jest.fn() },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DiseaseHistoryScreen } from '../DiseaseHistoryScreen';
import { diseaseApi } from '../../../../api/diseases';

const mockedGetByCrop = diseaseApi.getByCrop as jest.Mock;

// See src/screens/inventory/__tests__/InventoryListScreen.test.tsx for why:
// react-native-safe-area-context's initialWindowMetrics is statically null
// outside a native runtime, so SafeAreaProvider needs explicit fake metrics.
const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const route = { params: { pondId: 'pond-1', cropId: 'crop-1' } };

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <DiseaseHistoryScreen route={route} navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('DiseaseHistoryScreen — banned-substance flag badge', () => {
    beforeEach(() => jest.clearAllMocks());

    it('shows a "Flagged" banner naming the matched substance on a banned record', async () => {
        mockedGetByCrop.mockResolvedValue({
            data: [{
                id: 'r-1', cropId: 'crop-1', diseaseId: 'disease-1', recordedDate: '2026-06-17T00:00:00.000Z',
                notes: 'Treated with colistin', bannedSubstanceFlag: 'banned', bannedSubstanceMatches: ['Colistin'],
            }],
        });

        const { findByText } = renderScreen();
        expect(await findByText('Flagged: Colistin')).toBeTruthy();
    });

    it('shows no flag banner on a clean record', async () => {
        mockedGetByCrop.mockResolvedValue({
            data: [{
                id: 'r-2', cropId: 'crop-1', diseaseId: 'disease-1', recordedDate: '2026-06-17T00:00:00.000Z',
                notes: 'Improved water quality', bannedSubstanceFlag: 'none', bannedSubstanceMatches: [],
            }],
        });

        const { findByText, queryByText } = renderScreen();
        await findByText('Improved water quality');
        expect(queryByText(/Flagged:/)).toBeNull();
    });
});
