// Today's alerts: every alert, not one per pond — the founder's "View all" bug.
jest.mock('../../../api/alertCenter', () => ({ alertCenterApi: { all: jest.fn() } }));
jest.mock('../../../api/alerts', () => ({ alertsApi: { markAsRead: jest.fn() } }));
jest.mock('../../../api/farms', () => ({ farmsApi: { getAll: jest.fn() } }));
jest.mock('../../../api/ponds', () => ({ pondsApi: { getMine: jest.fn() } }));
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
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TodayAlertsScreen } from '../TodayAlertsScreen';
import { alertCenterApi } from '../../../api/alertCenter';
import { alertsApi } from '../../../api/alerts';
import { farmsApi } from '../../../api/farms';
import { pondsApi } from '../../../api/ponds';
import { queryClient } from '../../../query/client';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const navigation = { navigate: jest.fn() };
const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <TodayAlertsScreen navigation={navigation} />
        </SafeAreaProvider>,
    );

const POND = 'aaaaaaaa-1111-2222-3333-444444444444';
const live = [
    { key: 'water:p:Toxic ammonia', pondId: POND, farmId: 'f1', source: 'water', severity: 'critical', title: 'Toxic ammonia', body: 'Free NH₃ 0.5 mg/L', steps: ['Stop feeding', 'Partial water exchange', 'Add probiotics'] },
    { key: 'feed:p:Feed', pondId: POND, farmId: 'f1', source: 'feed', severity: 'watch', title: 'Feed efficiency dropping', body: 'Running FCR 2.1', steps: ['Check trays'] },
    {
        key: 'lunar:p:Post-molt', pondId: POND, farmId: 'f1', source: 'lunar', severity: 'watch', title: 'Post-molt — # action pending', body: 'Full moon', steps: ['Restore feed'],
        actions: { pondId: POND, windowKey: 'k', items: [{ key: 'restore_feed', source: 'manual', route: null }] },
    },
];
const saved = [{ id: 'a1', pondId: POND, farmId: 'f1', type: 'disease', severity: 'watch', title: 'WSSV risk', message: 'Temp dropped', steps: ['Raise biosecurity'], createdAt: '2026-09-14T01:00:00Z' }];

describe('TodayAlertsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        queryClient.clear();
        (farmsApi.getAll as jest.Mock).mockResolvedValue({ data: [{ id: 'f1', name: "Ravi's Farm" }] });
        (pondsApi.getMine as jest.Mock).mockResolvedValue({ data: [{ id: POND, farmId: 'f1', name: 'Pond 1', displayName: 'North Pond' }] });
        (alertCenterApi.all as jest.Mock).mockResolvedValue({ data: { live, saved } });
        (alertsApi.markAsRead as jest.Mock).mockResolvedValue({});
    });

    it('shows every alert for one pond with all steps and names, never a uuid', async () => {
        const { findByText, getByText, getAllByText, queryByText } = renderScreen();
        expect(await findByText('Toxic ammonia')).toBeTruthy();
        expect(getByText('Feed efficiency dropping')).toBeTruthy();
        expect(getByText('Free NH₃ 0.5 mg/L')).toBeTruthy();
        for (const s of ['Stop feeding', 'Partial water exchange', 'Add probiotics']) expect(getByText(s)).toBeTruthy();
        await waitFor(() => expect(getAllByText("North Pond · Ravi's Farm").length).toBe(4));
        expect(queryByText(new RegExp(POND.slice(0, 8)))).toBeNull();
        expect(getByText('1 critical · 3 watch')).toBeTruthy();
    });

    it('offers the lunar inline action and opens the pond', async () => {
        const { findByText, getAllByText } = renderScreen();
        // MoltInlineAction's tick for the lunar item's single manual step.
        expect(await findByText('Done')).toBeTruthy();
        fireEvent.press(getAllByText('Open pond')[0]);
        expect(navigation.navigate).toHaveBeenCalledWith('PondDashboard', { pondId: POND });
    });

    it('marks a saved alert read and refreshes the briefing reads', async () => {
        const spy = jest.spyOn(queryClient, 'invalidateQueries');
        const { findByText } = renderScreen();
        fireEvent.press(await findByText('Mark as read'));
        await waitFor(() => expect(alertsApi.markAsRead).toHaveBeenCalledWith('a1'));
        await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['briefing'] }));
    });

    it('says so when there are none, with a way to the Daily Brief', async () => {
        (alertCenterApi.all as jest.Mock).mockResolvedValue({ data: { live: [], saved: [] } });
        const { findByText } = renderScreen();
        expect(await findByText('No alerts right now')).toBeTruthy();
        fireEvent.press(await findByText('Open the Daily Brief'));
        expect(navigation.navigate).toHaveBeenCalledWith('MorningBriefing');
    });
});
