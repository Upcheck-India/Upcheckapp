jest.mock('../../../api/dailyBrief', () => ({
    dailyBriefApi: { get: jest.fn() },
}));
// The real exports pull in expo-print / expo-file-system; the screen only calls them.
jest.mock('../../../features/export/dayReport', () => ({
    exportDayReportPdf: jest.fn(async () => undefined),
    shareDayCardImage: jest.fn(async () => undefined),
}));
jest.mock('../../../components/brief/DayCardSvg', () => ({ DayCardRenderer: () => null }));
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
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DailyBriefScreen } from '../DailyBriefScreen';
import { MorningBriefingRoute } from '../MorningBriefingRoute';
import { dailyBriefApi } from '../../../api/dailyBrief';
import { exportDayReportPdf } from '../../../features/export/dayReport';
import { useRemoteFlagsStore } from '../../../features/remoteFlags';
import { makeBrief, pond } from '../../../features/__fixtures__/dailyBrief';

const mockedGet = dailyBriefApi.get as jest.Mock;
const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const navigation = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };

const renderAt = (istIso: string, params: any = {}) => {
    jest.useFakeTimers({ now: new Date(istIso), advanceTimers: true });
    return render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <DailyBriefScreen navigation={navigation} route={{ params }} />
        </SafeAreaProvider>,
    );
};

/** The testIDs of the blocks, top to bottom. */
const order = (utils: ReturnType<typeof render>) =>
    utils
        .UNSAFE_queryAllByProps({})
        .map((n: any) => n.props.testID)
        .filter((id: unknown): id is string => typeof id === 'string' && /^brief-(carried|todo|happening|ponds|numbers)$/.test(id))
        .filter((id, i, all) => all.indexOf(id) === i);

beforeEach(() => {
    jest.clearAllMocks();
    useRemoteFlagsStore.setState({ flags: {}, payloads: {} });
});
afterEach(() => jest.useRealTimers());

describe('DailyBriefScreen', () => {
    it('morning brief: score, verdict, ribbon, and carried-over leads the blocks', async () => {
        mockedGet.mockResolvedValue({ data: makeBrief() });
        const utils = renderAt('2026-09-14T08:00:00+05:30');
        expect(await utils.findByTestId('brief-verdict')).toHaveTextContent('Most ponds are steady — Pond 2 needs attention');
        expect(utils.getByText('Morning brief')).toBeTruthy();
        expect(utils.getByTestId('brief-score')).toHaveTextContent('71');
        expect(utils.getByText('Up 6 from the day before')).toBeTruthy();
        expect(utils.getByTestId('day-ribbon')).toBeTruthy();
        expect(utils.getByText('Woke up with')).toBeTruthy();
        expect(order(utils)[0]).toBe('brief-carried');
        expect(mockedGet).toHaveBeenCalledWith({ date: '2026-09-14' });
        // Next day is disabled on today.
        expect(utils.getByTestId('brief-next-day')).toBeDisabled();
    });

    it('day so far from 15:00 leads with the to-do list', async () => {
        mockedGet.mockResolvedValue({ data: makeBrief() });
        const utils = renderAt('2026-09-14T16:00:00+05:30');
        expect(await utils.findByText('Day so far')).toBeTruthy();
        await utils.findByTestId('brief-todo');
        expect(order(utils)[0]).toBe('brief-todo');
    });

    it('day wrap from 19:00 leads with the numbers', async () => {
        mockedGet.mockResolvedValue({ data: makeBrief() });
        const utils = renderAt('2026-09-14T20:00:00+05:30');
        expect(await utils.findByText('Day wrap')).toBeTruthy();
        await utils.findByTestId('brief-numbers');
        expect(order(utils)[0]).toBe('brief-numbers');
        expect(utils.getByText('₹1,200')).toBeTruthy();
    });

    it('a past date is a day report: done vs missed, no log buttons', async () => {
        mockedGet.mockResolvedValue({ data: makeBrief({ date: '2026-09-10', isToday: false }) });
        const utils = renderAt('2026-09-14T08:00:00+05:30', { date: '2026-09-10' });
        expect(await utils.findByText('Day report')).toBeTruthy();
        expect(mockedGet).toHaveBeenCalledWith({ date: '2026-09-10' });
        expect(utils.getByText('What was to be done')).toBeTruthy();
        expect(utils.getByText('Not logged')).toBeTruthy();
        expect(utils.queryByLabelText('Log feed in Pond 2')).toBeNull();
        expect(utils.getByText('From the day before')).toBeTruthy();
    });

    it('unscored day: no number, a plain no-score verdict', async () => {
        mockedGet.mockResolvedValue({
            data: makeBrief({
                score: null,
                previousScore: null,
                ponds: [pond('p1', 'Pond 1', null)],
                verdict: { band: 'none', pondsGood: 0, pondsWatch: 0, pondsAttention: 0, pondsUnscored: 1, weakestPondId: null },
            }),
        });
        const utils = renderAt('2026-09-14T08:00:00+05:30');
        expect(await utils.findByTestId('brief-verdict')).toHaveTextContent('Not enough has been logged yet to judge today');
        expect(utils.getByTestId('brief-score')).toHaveTextContent('–');
        expect(utils.getAllByText('No score yet').length).toBeGreaterThan(0);
    });

    it('nothing logged that day says so and offers to log', async () => {
        mockedGet.mockResolvedValue({ data: makeBrief({ hasAnyData: false, score: null, timeline: [] }) });
        const utils = renderAt('2026-09-14T08:00:00+05:30');
        expect(await utils.findByTestId('brief-nothing-logged')).toBeTruthy();
        expect(utils.queryByTestId('day-ribbon')).toBeNull();
        fireEvent.press(utils.getByText('Log now'));
        expect(navigation.navigate).toHaveBeenCalledWith('QuickLog');
    });

    it('no farms: invitation to set one up', async () => {
        mockedGet.mockResolvedValue({ data: makeBrief({ farms: [], ponds: [], hasAnyData: false }) });
        const utils = renderAt('2026-09-14T08:00:00+05:30');
        expect(await utils.findByText('No farm set up yet')).toBeTruthy();
    });

    it('error with no cached copy: retry', async () => {
        mockedGet.mockRejectedValue(new Error('offline'));
        const utils = renderAt('2026-09-14T08:00:00+05:30');
        expect(await utils.findByText('Could not load this day')).toBeTruthy();
    });

    it('previous day and farm switch refetch with the right params; missing log opens its log screen', async () => {
        mockedGet.mockResolvedValue({ data: makeBrief() });
        const utils = renderAt('2026-09-14T08:00:00+05:30');
        await utils.findByTestId('brief-verdict');

        fireEvent.press(utils.getByLabelText('Log feed in Pond 2'));
        expect(navigation.navigate).toHaveBeenCalledWith('FeedLog', { pondId: 'p2', pondName: 'Pond 2' });

        fireEvent.press(utils.getByText('All farms ▾'));
        fireEvent.press(within(utils.getByLabelText('Choose farm')).getByText('Ravi Farm'));
        await waitFor(() => expect(mockedGet).toHaveBeenCalledWith({ date: '2026-09-14', farmId: 'f2' }));

        fireEvent.press(utils.getByTestId('brief-prev-day'));
        await waitFor(() => expect(mockedGet).toHaveBeenCalledWith({ date: '2026-09-13', farmId: 'f2' }));
    });

    it('ribbon: an hour with entries lists them in IST', async () => {
        mockedGet.mockResolvedValue({ data: makeBrief() });
        const utils = renderAt('2026-09-14T08:00:00+05:30');
        await utils.findByTestId('day-ribbon');
        // Water test at 20:00Z = 01:30 IST → hour 1.
        const hour = utils.getByTestId('ribbon-hour-1');
        expect(hour.props.accessibilityLabel).toBe('01:00, 1 entry: Water test');
        fireEvent.press(hour);
        const list = utils.getByTestId('ribbon-hour-list');
        expect(within(list).getByText('01:30')).toBeTruthy();
        expect(within(list).getByText('DO 2.8')).toBeTruthy();
    });

    it('export PDF passes the brief and language through', async () => {
        const b = makeBrief();
        mockedGet.mockResolvedValue({ data: b });
        const utils = renderAt('2026-09-14T08:00:00+05:30');
        fireEvent.press(await utils.findByText('Export PDF'));
        await waitFor(() => expect(exportDayReportPdf).toHaveBeenCalledWith(b, 'en'));
    });

    it('the old MorningBriefing route renders the brief while the flag is on', async () => {
        mockedGet.mockResolvedValue({ data: makeBrief() });
        jest.useFakeTimers({ now: new Date('2026-09-14T08:00:00+05:30'), advanceTimers: true });
        const utils = render(
            <SafeAreaProvider initialMetrics={METRICS}>
                <MorningBriefingRoute navigation={navigation} route={{}} />
            </SafeAreaProvider>,
        );
        expect(await utils.findByTestId('brief-verdict')).toBeTruthy();
    });
});
