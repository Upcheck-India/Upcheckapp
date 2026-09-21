// A refresh that fails must neither wipe the rows already on screen nor
// pass them off as fresh: the rows stay, with a "couldn't refresh" note.
jest.mock('../../../../api/feedRecords', () => ({
    feedApi: { getByCrop: jest.fn(), getAll: jest.fn() },
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
import { FlatList } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeedHistoryScreen } from '../FeedHistoryScreen';
import { feedApi } from '../../../../api/feedRecords';

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <FeedHistoryScreen
                route={{ params: { pondId: 'pond-1', cropId: 'crop-1' } }}
                navigation={{ goBack: jest.fn(), navigate: jest.fn() }}
            />
        </SafeAreaProvider>,
    );

it('keeps the rows and says so when a refresh fails', async () => {
    (feedApi.getByCrop as jest.Mock)
        .mockResolvedValueOnce({ data: [{ id: 'f1', quantityKg: 12, recordedAt: '2026-09-18T06:00:00Z' }] })
        .mockRejectedValueOnce(new Error('Network Error'));

    const screen = renderScreen();
    expect(await screen.findByText('12 kg')).toBeTruthy();
    expect(screen.queryByTestId('stale-notice')).toBeNull();

    await act(async () => {
        screen.UNSAFE_getByType(FlatList).props.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(screen.getByTestId('stale-notice')).toBeTruthy());
    expect(screen.getByText('12 kg')).toBeTruthy();
});
