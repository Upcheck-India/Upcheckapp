// A read that failed is not a zero: "0 kg in stock" or "no feed logged" for a
// timed-out request is a wrong answer. Failed-with-nothing is an error with
// retry; a partial failure keeps what did load and says the data may be stale.
jest.mock('../../../api/feedRecords', () => ({
    feedApi: { getAll: jest.fn(), getByCrop: jest.fn(), getTotalByPond: jest.fn() },
}));
jest.mock('../../../api/inventory', () => ({ inventoryApi: { getAll: jest.fn() } }));
jest.mock('../../../api/pondContext', () => ({ pondContextApi: { get: jest.fn() } }));
jest.mock('../../../components/charts/LineChart', () => ({ LineChart: () => null }));
jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual('@react-navigation/native');
    return {
        ...actual,
        useFocusEffect: (effect: () => void) => {
            const React = require('react');
            React.useEffect(effect, [effect]);
        },
    };
});

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeedStatsScreen } from '../FeedStatsScreen';
import { feedApi } from '../../../api/feedRecords';
import { inventoryApi } from '../../../api/inventory';
import { pondContextApi } from '../../../api/pondContext';

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <FeedStatsScreen route={{ params: { pondId: 'p1', farmId: 'f1' } }} />
        </SafeAreaProvider>,
    );

const fail = () => Promise.reject(new Error('Network Error'));

beforeEach(() => jest.clearAllMocks());

it('shows an error with retry, not zeros, when nothing loads', async () => {
    (feedApi.getAll as jest.Mock).mockImplementation(fail);
    (pondContextApi.get as jest.Mock).mockImplementation(fail);
    (feedApi.getTotalByPond as jest.Mock).mockImplementation(fail);
    (inventoryApi.getAll as jest.Mock).mockImplementation(fail);

    const screen = renderScreen();
    const retry = await screen.findByText('Retry');
    expect(screen.queryByText(/in stock/i)).toBeNull();

    (feedApi.getAll as jest.Mock).mockResolvedValue({ data: [] });
    (pondContextApi.get as jest.Mock).mockResolvedValue({ data: null });
    (feedApi.getTotalByPond as jest.Mock).mockResolvedValue({ data: 42 });
    (inventoryApi.getAll as jest.Mock).mockResolvedValue({ data: [] });
    fireEvent.press(retry);
    expect(await screen.findByText('42')).toBeTruthy();
});

it('keeps what loaded and flags the rest when one read fails', async () => {
    (feedApi.getAll as jest.Mock).mockResolvedValue({ data: [] });
    (pondContextApi.get as jest.Mock).mockResolvedValue({ data: null });
    (feedApi.getTotalByPond as jest.Mock).mockResolvedValue({ data: 42 });
    (inventoryApi.getAll as jest.Mock).mockImplementation(fail);

    const screen = renderScreen();
    expect(await screen.findByText('42')).toBeTruthy();
    expect(screen.getByTestId('stale-notice')).toBeTruthy();
    // The inventory never loaded, so no stock figure — not "0 kg".
    expect(screen.queryByText(/in stock/i)).toBeNull();
});
