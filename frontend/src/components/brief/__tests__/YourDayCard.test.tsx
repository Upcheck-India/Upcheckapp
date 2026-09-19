jest.mock('../../../api/dailyBrief', () => ({
    dailyBriefApi: { get: jest.fn() },
}));
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
import { render, fireEvent } from '@testing-library/react-native';
import { YourDayCard } from '../YourDayCard';
import { dailyBriefApi } from '../../../api/dailyBrief';
import { useRemoteFlagsStore } from '../../../features/remoteFlags';
import { incompleteBrief, makeBrief } from '../../../features/__fixtures__/dailyBrief';

const mockedGet = dailyBriefApi.get as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue({ data: makeBrief() });
});
afterEach(() => useRemoteFlagsStore.setState({ flags: {}, payloads: {} }));

describe('YourDayCard (Home)', () => {
    it('shows score, band, verdict and the next thing to do; tap opens the brief', async () => {
        const onOpen = jest.fn();
        const utils = render(<YourDayCard onOpen={onOpen} farmId="f1" />);
        const card = await utils.findByTestId('home-your-day');
        expect(utils.getByText('71')).toBeTruthy();
        expect(utils.getByText('Watch')).toBeTruthy();
        expect(utils.getByText('Pond 2 needs attention')).toBeTruthy();
        expect(utils.getByText('Next: Log feed in Pond 2')).toBeTruthy();
        expect(mockedGet).toHaveBeenCalledWith(expect.objectContaining({ farmId: 'f1' }));
        fireEvent.press(card);
        expect(onOpen).toHaveBeenCalled();
    });

    it('incomplete day: grey "Incomplete", no band word, coverage shown, top to-do is the critical stale pond', async () => {
        mockedGet.mockResolvedValue({ data: incompleteBrief() });
        const utils = render(<YourDayCard onOpen={jest.fn()} farmId="f-incomplete" />);
        await utils.findByTestId('home-your-day');
        expect(utils.getByText('Incomplete')).toBeTruthy();
        expect(utils.queryByText('Good')).toBeNull();
        expect(utils.getByText('Based on 1 of 3 stocked ponds')).toBeTruthy();
        expect(utils.getByText('Next: IND06 — nothing logged for 7 days')).toBeTruthy();
    });

    it('is hidden, and never fetches, when the dailyBrief flag is off', async () => {
        useRemoteFlagsStore.setState({ flags: { 'app-daily-brief': false }, payloads: {} });
        const utils = render(<YourDayCard onOpen={jest.fn()} />);
        await new Promise((r) => setTimeout(r, 0));
        expect(utils.queryByTestId('home-your-day')).toBeNull();
        expect(mockedGet).not.toHaveBeenCalled();
    });

    it('renders nothing on a failed read with no cache — Home never waits on it', async () => {
        mockedGet.mockRejectedValue(new Error('offline'));
        const utils = render(<YourDayCard onOpen={jest.fn()} />);
        await new Promise((r) => setTimeout(r, 0));
        expect(utils.queryByTestId('home-your-day')).toBeNull();
    });
});
