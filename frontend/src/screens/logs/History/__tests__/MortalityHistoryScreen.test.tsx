/**
 * P1: mortality photos were signed and returned by the API but no screen
 * ever rendered them (design doc §1.2). This locks in that the history
 * screen now shows a PhotoStrip whenever a record carries signed photo URLs.
 */
jest.mock('../../../../api/mortalities', () => ({
    mortalityApi: { getByCrop: jest.fn(), remove: jest.fn() },
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
import { MortalityHistoryScreen } from '../MortalityHistoryScreen';
import { mortalityApi } from '../../../../api/mortalities';

const mockedGetByCrop = mortalityApi.getByCrop as jest.Mock;

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const route = { params: { pondId: 'pond-1', cropId: 'crop-1' } };

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <MortalityHistoryScreen navigation={navigation} route={route} />
        </SafeAreaProvider>,
    );

describe('MortalityHistoryScreen — photos render (P1)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('renders a PhotoStrip for a record with signed photo URLs', async () => {
        mockedGetByCrop.mockResolvedValue({
            data: [
                {
                    id: 'm1',
                    cropId: 'crop-1',
                    recordDate: '2026-09-18',
                    quantity: 5,
                    photoSignedUrls: ['https://signed/full-a'],
                    photoThumbUrls: ['https://signed/thumb-a'],
                },
            ],
        });
        const { findByLabelText } = renderScreen();
        expect(await findByLabelText('View photo')).toBeTruthy();
    });

    it('shows no photo strip for a record with no photos', async () => {
        mockedGetByCrop.mockResolvedValue({
            data: [{ id: 'm2', cropId: 'crop-1', recordDate: '2026-09-18', quantity: 3 }],
        });
        const { findByText, queryByLabelText } = renderScreen();
        await findByText('18 Sept 2026');
        expect(queryByLabelText('View photo')).toBeNull();
    });
});
