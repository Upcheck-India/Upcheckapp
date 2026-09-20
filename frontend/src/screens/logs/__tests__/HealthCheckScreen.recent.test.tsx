/**
 * P1: health-check photos were uploaded and signed but no screen ever
 * rendered them back. HealthCheckScreen is the only screen that ever
 * attaches them, so it's also where they must be visible again.
 */
jest.mock('../../../api/healthObservations', () => ({
    ...jest.requireActual('../../../api/healthObservations'),
    healthObservationsApi: {
        listForPond: jest.fn(),
        save: jest.fn(),
        uploadPhoto: jest.fn(),
        removePhoto: jest.fn(),
    },
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
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HealthCheckScreen } from '../HealthCheckScreen';
import { healthObservationsApi } from '../../../api/healthObservations';

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const route = { params: { pondId: 'pond-1', pondName: 'Pond 1' } };

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <HealthCheckScreen navigation={navigation} route={route} />
        </SafeAreaProvider>,
    );

describe('HealthCheckScreen — recent checks with photos (P1)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('renders a PhotoStrip for a past check that has signed photo URLs', async () => {
        (healthObservationsApi.listForPond as jest.Mock).mockResolvedValue({
            data: [
                {
                    id: 'h1', pondId: 'pond-1', cropId: null, observedOn: '2026-09-18',
                    sign: 'white_feces', level: 'few', sampleSize: null, count: null, moltDeaths: null,
                    source: 'quick', windowKey: null, photoUrls: ['p'],
                    photoSignedUrls: ['https://signed/full'], photoThumbUrls: ['https://signed/thumb'],
                    createdAt: '2026-09-18T10:00:00Z',
                },
            ],
        });
        const { findByLabelText } = renderScreen();
        expect(await findByLabelText('View photo')).toBeTruthy();
    });

    it('shows nothing extra when there is no history yet', async () => {
        (healthObservationsApi.listForPond as jest.Mock).mockResolvedValue({ data: [] });
        const { queryByLabelText, findByText } = renderScreen();
        await findByText('Health check');
        expect(queryByLabelText('View photo')).toBeNull();
    });
});
