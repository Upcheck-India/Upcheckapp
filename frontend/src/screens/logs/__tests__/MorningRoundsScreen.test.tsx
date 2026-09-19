/**
 * L3 — the multi-pond grid, the retention bet.
 *
 * Quick mode cut each form from ten fields to three. Nobody cut the number of
 * FORMS. A four-pond farmer doing the morning round walked QuickLog → picker →
 * tile → form → save → back, four times — about 35–40 interactions — then again
 * in the evening. That is where paper still wins, and not on field count: one
 * notebook page holds every pond in a single pass.
 *
 * The rules that make the data honest are what these tests pin, because they
 * are the ones a grid makes tempting to drop.
 */
jest.mock('../../../api/ponds', () => ({
    pondsApi: { getMine: jest.fn() },
}));
jest.mock('../../../api/todaySnapshot', () => ({
    fetchTodaySnapshot: jest.fn(),
}));
jest.mock('../../../sync/recordSync', () => ({
    saveRecord: jest.fn(),
    drainRecordQueue: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-crypto', () => {
    let n = 0;
    return { randomUUID: () => `uuid-${++n}` };
});
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
import { ScrollView } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MorningRoundsScreen, SAVE_POOL } from '../MorningRoundsScreen';
import { pondsApi } from '../../../api/ponds';
import { fetchTodaySnapshot } from '../../../api/todaySnapshot';
import { saveRecord } from '../../../sync/recordSync';
import { qk, queryClient } from '../../../query/client';
import { useUIStore } from '../../../store/uiStore';
import { useAuthStore } from '../../../store/authStore';
import { draftKey } from '../../../features/roundsDraft';

const mockedSave = saveRecord as jest.Mock;
const mockedSnapshot = fetchTodaySnapshot as jest.Mock;

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

const pond = (i: number) => ({
    id: `p${i}`,
    farmId: 'f1',
    name: `P${i}`,
    displayName: `Pond ${i}`,
    activeCycleId: `c${i}`,
});
const P1 = { ...pond(1), displayName: 'North pond' };
const P2 = { ...pond(2), displayName: 'South pond' };
const P3 = { ...pond(3), displayName: 'East pond' };

const renderScreen = (ponds: any[] = [P1, P2, P3]) => {
    queryClient.clear();
    queryClient.setQueryData(qk.ponds(), ponds);
    (pondsApi.getMine as jest.Mock).mockResolvedValue({ data: ponds });
    return render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <MorningRoundsScreen navigation={navigation} />
        </SafeAreaProvider>,
    );
};

/** Snapshot context carrying a pond's last reading. */
const ctx = (pondId: string, wq: Record<string, any>) => ({ pondId, farmId: 'f1', waterQuality: wq });

const KEY = () => draftKey('u1');
const seedDraft = async (rows: Record<string, any>, key = KEY(), userId = 'u1') =>
    AsyncStorage.setItem(key, JSON.stringify({ userId, savedAt: new Date().toISOString(), rows }));
const storedDraft = async (key = KEY()) => {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
};

const toasts: any[] = [];

beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    toasts.length = 0;
    useUIStore.setState({ showToast: (t: any) => { toasts.push(t); } } as any);
    useAuthStore.setState({ user: { id: 'u1' } } as any);
    (pondsApi.getMine as jest.Mock).mockResolvedValue({ data: [P1, P2, P3] });
    mockedSnapshot.mockResolvedValue({ contexts: [], briefing: [], moltWindow: null });
    mockedSave.mockResolvedValue({ id: 'r1', queued: false });
});

describe('MorningRoundsScreen', () => {
    it('lists every pond as its own row', async () => {
        const { findByTestId } = renderScreen();

        expect(await findByTestId('rounds-row-p1')).toBeTruthy();
        expect(await findByTestId('rounds-row-p2')).toBeTruthy();
        expect(await findByTestId('rounds-row-p3')).toBeTruthy();
    });

    /**
     * THE RULE THAT MATTERS MOST (L2). A pond the farmer did not measure must
     * not become a record — otherwise walking this screen would mark every
     * pond as logged, stop their reminders and hold a green streak on data
     * nobody collected. That is the exact failure L2 exists to close, and a
     * grid is the easiest place to reintroduce it.
     */
    it('writes only the ponds that were filled in, never the blank ones', async () => {
        const { findByTestId, getByText } = renderScreen();
        fireEvent.changeText(await findByTestId('rounds-ph-p2'), '7.9');

        fireEvent.press(getByText('Save 1 ponds'));

        await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
        expect(mockedSave.mock.calls[0][0].payload).toMatchObject({ pondId: 'p2', ph: 7.9 });
    });

    it('writes one record per filled pond, through the ordinary offline queue', async () => {
        const { findByTestId, getByText } = renderScreen();
        fireEvent.changeText(await findByTestId('rounds-ph-p1'), '7.5');
        fireEvent.changeText(await findByTestId('rounds-dissolvedOxygen-p1'), '5.2');
        fireEvent.changeText(await findByTestId('rounds-ph-p3'), '8.1');

        fireEvent.press(getByText('Save 2 ponds'));

        await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(2));
        // No batch endpoint: N queued records is the right shape for someone
        // who may lose signal between pond two and pond three.
        for (const call of mockedSave.mock.calls) {
            expect(call[0].endpoint).toBe('/water-quality');
            expect(call[0].entity).toBe('water_quality');
            expect(typeof call[0].payload.id).toBe('string'); // idempotent replay key
        }
        expect(mockedSave.mock.calls[0][0].payload).toMatchObject({
            pondId: 'p1',
            ph: 7.5,
            dissolvedOxygen: 5.2,
        });
    });

    /** Stamped at press time, not drain time — same lesson as the check-in fix. */
    it('records the time the farmer pressed save, not the time it syncs', async () => {
        const { findByTestId, getByText } = renderScreen();
        fireEvent.changeText(await findByTestId('rounds-ph-p1'), '7.5');

        fireEvent.press(getByText('Save 1 ponds'));

        await waitFor(() => expect(mockedSave).toHaveBeenCalled());
        const at = mockedSave.mock.calls[0][0].payload.recordedAt;
        expect(Number.isNaN(Date.parse(at))).toBe(false);
        expect(Math.abs(Date.parse(at) - Date.now())).toBeLessThan(60_000);
    });

    it('cannot be saved with nothing entered at all', async () => {
        const { findByText, getByText } = renderScreen();
        await findByText('North pond');

        fireEvent.press(getByText('Save'));

        expect(mockedSave).not.toHaveBeenCalled();
    });

    /**
     * PARTIAL FAILURE IS THE WHOLE POINT OF STAYING PUT. `PondNamesScreen`
     * toasts a count and resets to Home with no retry path; repeating that here
     * would throw away a morning's readings for the ponds that failed.
     */
    it('keeps the failed ponds on screen with their readings intact', async () => {
        mockedSave
            .mockResolvedValueOnce({ id: 'r1', queued: false })
            .mockRejectedValueOnce(new Error('boom'));

        const { findByTestId, getByText, getByTestId } = renderScreen();
        fireEvent.changeText(await findByTestId('rounds-ph-p1'), '7.5');
        fireEvent.changeText(await findByTestId('rounds-ph-p2'), '8.2');

        fireEvent.press(getByText('Save 2 ponds'));

        await waitFor(() => expect(toasts.at(-1)?.type).toBe('error'));
        // Still here, still typed, and the one that worked is cleared.
        expect(getByTestId('rounds-ph-p2').props.value).toBe('8.2');
        expect(getByTestId('rounds-ph-p1').props.value).toBe('');
        expect(navigation.goBack).not.toHaveBeenCalled();
    });

    it('goes back only when everything landed', async () => {
        const { findByTestId, getByText } = renderScreen();
        fireEvent.changeText(await findByTestId('rounds-ph-p1'), '7.5');

        fireEvent.press(getByText('Save 1 ponds'));

        await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    });
});

/**
 * "I have 10 ponds and I'm just looking at a spinner." The saves were awaited
 * one after another; they now run SAVE_POOL at a time with a live count.
 */
describe('saving ten ponds', () => {
    const TEN = Array.from({ length: 10 }, (_, i) => pond(i + 1));

    const fillAll = async (utils: ReturnType<typeof renderScreen>) => {
        for (const p of TEN) fireEvent.changeText(await utils.findByTestId(`rounds-ph-${p.id}`), '7.8');
    };

    it(`keeps exactly ${SAVE_POOL} in flight and shows progress instead of a bare spinner`, async () => {
        let inFlight = 0;
        let maxInFlight = 0;
        const resolvers: (() => void)[] = [];
        mockedSave.mockImplementation(
            () =>
                new Promise((resolve) => {
                    inFlight += 1;
                    maxInFlight = Math.max(maxInFlight, inFlight);
                    resolvers.push(() => {
                        inFlight -= 1;
                        resolve({ id: 'x', queued: false });
                    });
                }),
        );
        const utils = renderScreen(TEN);
        await fillAll(utils);

        fireEvent.press(utils.getByText('Save 10 ponds'));

        await waitFor(() => expect(inFlight).toBe(4));
        expect(utils.getByText('Saving… 0 of 10')).toBeTruthy();

        await act(async () => resolvers.shift()!());
        await waitFor(() => expect(utils.getByText('Saving… 1 of 10')).toBeTruthy());
        // One finished → the next pond starts straight away.
        await waitFor(() => expect(inFlight).toBe(4));

        while (mockedSave.mock.calls.length < 10 || inFlight > 0) {
            await act(async () => resolvers.shift()?.());
            await act(async () => undefined);
        }
        await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
        expect(maxInFlight).toBe(SAVE_POOL);
        expect(mockedSave).toHaveBeenCalledTimes(10);
        expect(new Set(mockedSave.mock.calls.map((c) => c[0].payload.pondId)).size).toBe(10);
    });

    it('takes about ceil(10/4) round trips, not ten', async () => {
        const RTT = 200;
        let firstStart = 0;
        let lastEnd = 0;
        mockedSave.mockImplementation(() => {
            firstStart ||= Date.now();
            return new Promise((r) =>
                setTimeout(() => {
                    lastEnd = Date.now();
                    r({ id: 'x', queued: false });
                }, RTT),
            );
        });
        const utils = renderScreen(TEN);
        await fillAll(utils);

        fireEvent.press(utils.getByText('Save 10 ponds'));
        await waitFor(() => expect(navigation.goBack).toHaveBeenCalled(), { timeout: 5000 });
        // Network span only (first request out → last response in), so a slow
        // test renderer cannot blur it: 3 slots ≈ 600 ms, the old serial loop
        // was 10 × RTT = 2000 ms.
        const span = lastEnd - firstStart;

        expect(span).toBeGreaterThanOrEqual(3 * RTT - 20);
        expect(span).toBeLessThan(5 * RTT);
    });

    it('still reports every failed pond and keeps only those rows', async () => {
        mockedSave.mockImplementation(async ({ payload }: any) => {
            if (payload.pondId === 'p3' || payload.pondId === 'p8') throw new Error('400');
            return { id: 'x', queued: false };
        });
        const utils = renderScreen(TEN);
        await fillAll(utils);

        fireEvent.press(utils.getByText('Save 10 ponds'));

        await waitFor(() => expect(toasts.at(-1)?.type).toBe('error'));
        expect(toasts.at(-1).message).toContain('2');
        for (const p of TEN) {
            const kept = p.id === 'p3' || p.id === 'p8';
            expect(utils.getByTestId(`rounds-ph-${p.id}`).props.value).toBe(kept ? '7.8' : '');
        }
        expect(navigation.goBack).not.toHaveBeenCalled();
    });
});

/** "That draft should not become a bug." */
describe('the unsaved draft', () => {
    it('is saved as the farmer types, under this user and today', async () => {
        const { findByTestId } = renderScreen();
        fireEvent.changeText(await findByTestId('rounds-ph-p2'), '7.6');

        await waitFor(async () => {
            const d = await storedDraft();
            expect(d?.rows?.p2?.cells?.ph?.v).toBe('7.6');
        });
        expect(KEY()).toMatch(/^morning-rounds:draft:u1:\d{4}-\d{2}-\d{2}$/);
    });

    it('restores today’s draft with a banner and never auto-submits', async () => {
        await seedDraft({ p2: { cells: { ph: { v: '7.4' } }, editedAt: new Date().toISOString() } });
        const { findByTestId, getByTestId } = renderScreen();

        expect(await findByTestId('rounds-draft-banner')).toBeTruthy();
        expect(getByTestId('rounds-ph-p2').props.value).toBe('7.4');
        expect(mockedSave).not.toHaveBeenCalled();
    });

    it('submits a restored row at the time it was typed, not restore/submit time', async () => {
        const typedAt = new Date(Date.now() - 45 * 60_000).toISOString();
        await seedDraft({ p2: { cells: { ph: { v: '7.4' } }, editedAt: typedAt } });
        const { findByTestId, getByText } = renderScreen();
        await findByTestId('rounds-draft-banner');

        fireEvent.press(getByText('Save 1 ponds'));

        await waitFor(() => expect(mockedSave).toHaveBeenCalled());
        expect(mockedSave.mock.calls[0][0].payload.recordedAt).toBe(typedAt);
    });

    it('Discard clears the grid and the stored draft', async () => {
        await seedDraft({ p2: { cells: { ph: { v: '7.4' } }, editedAt: new Date().toISOString() } });
        const { findByTestId, getByTestId, queryByTestId } = renderScreen();

        fireEvent.press(await findByTestId('rounds-draft-discard'));

        expect(getByTestId('rounds-ph-p2').props.value).toBe('');
        expect(queryByTestId('rounds-draft-banner')).toBeNull();
        await waitFor(async () => expect(await storedDraft()).toBeNull());
    });

    it('is cleared once everything saved', async () => {
        const { findByTestId, getByText } = renderScreen();
        fireEvent.changeText(await findByTestId('rounds-ph-p1'), '7.5');
        await waitFor(async () => expect(await storedDraft()).not.toBeNull());

        fireEvent.press(getByText('Save 1 ponds'));

        await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
        await new Promise((r) => setTimeout(r, 600)); // past any debounce
        expect(await storedDraft()).toBeNull();
    });

    it('keeps ONLY the failed rows after a partial failure', async () => {
        mockedSave
            .mockResolvedValueOnce({ id: 'r1', queued: false })
            .mockRejectedValueOnce(new Error('boom'));
        const { findByTestId, getByText } = renderScreen();
        fireEvent.changeText(await findByTestId('rounds-ph-p1'), '7.5');
        fireEvent.changeText(await findByTestId('rounds-ph-p2'), '8.2');

        fireEvent.press(getByText('Save 2 ponds'));

        await waitFor(() => expect(toasts.at(-1)?.type).toBe('error'));
        await waitFor(async () => {
            const d = await storedDraft();
            expect(Object.keys(d.rows)).toEqual(['p2']);
        });
        // The failed row keeps its record id, so a retry is idempotent.
        const d = await storedDraft();
        expect(d.rows.p2.id).toBe(mockedSave.mock.calls[1][0].payload.id);
    });

    it("deletes yesterday's draft unread — a stale reading is never today's", async () => {
        const yesterdayKey = draftKey('u1', new Date(Date.now() - 24 * 3600_000));
        await seedDraft(
            { p2: { cells: { ph: { v: '7.4' } }, editedAt: new Date().toISOString() } },
            yesterdayKey,
        );
        const { findByTestId, queryByTestId, getByTestId } = renderScreen();
        await findByTestId('rounds-row-p2');

        await waitFor(async () => expect(await AsyncStorage.getItem(yesterdayKey)).toBeNull());
        expect(queryByTestId('rounds-draft-banner')).toBeNull();
        expect(getByTestId('rounds-ph-p2').props.value).toBe('');
    });

    it("never reads another user's draft", async () => {
        await seedDraft(
            { p2: { cells: { ph: { v: '7.4' } }, editedAt: new Date().toISOString() } },
            draftKey('u2'),
            'u2',
        );
        const { findByTestId, queryByTestId, getByTestId } = renderScreen();
        await findByTestId('rounds-row-p2');
        await act(async () => new Promise((r) => setTimeout(r, 50)));

        expect(queryByTestId('rounds-draft-banner')).toBeNull();
        expect(getByTestId('rounds-ph-p2').props.value).toBe('');
        // Not ours to delete either — it goes when u2 signs out.
        expect(await AsyncStorage.getItem(draftKey('u2'))).not.toBeNull();
    });

    it('ignores a corrupt draft and starts empty', async () => {
        await AsyncStorage.setItem(KEY(), '{not json');
        const { findByTestId, queryByTestId, getByTestId } = renderScreen();
        await findByTestId('rounds-row-p1');
        await act(async () => new Promise((r) => setTimeout(r, 50)));

        expect(queryByTestId('rounds-draft-banner')).toBeNull();
        expect(getByTestId('rounds-ph-p1').props.value).toBe('');
    });

    it('drops rows for ponds no longer listed and cells that do not parse', async () => {
        const now = new Date().toISOString();
        await seedDraft({
            gone: { cells: { ph: { v: '7.1' } }, editedAt: now },
            p1: { cells: { ph: { v: 'abc' }, dissolvedOxygen: { v: '5.5' } }, editedAt: now },
        });
        const { findByTestId, getByTestId } = renderScreen();
        await findByTestId('rounds-draft-banner');

        expect(getByTestId('rounds-ph-p1').props.value).toBe('');
        expect(getByTestId('rounds-dissolvedOxygen-p1').props.value).toBe('5.5');
    });
});

/** "Auto fill from the previous log … but prompt the user to check every data." */
describe('prefill from the last reading', () => {
    const LAST = '2026-09-18T00:40:00.000Z'; // 18 Sep 06:10 IST

    beforeEach(() => {
        mockedSnapshot.mockResolvedValue({
            contexts: [ctx('p1', { ph: 7.8, phAsOf: LAST, dissolvedOxygen: 5.1, dissolvedOxygenAsOf: LAST, recordedAt: LAST })],
            briefing: [],
            moltWindow: null,
        });
    });

    it('fills empty cells, marked as last values, without counting them as entered', async () => {
        const { findByTestId, getByText, getAllByText } = renderScreen();

        await waitFor(async () => expect((await findByTestId('rounds-ph-p1')).props.value).toBe('7.8'));
        expect(getAllByText(/^last: /).length).toBeGreaterThan(0);
        // Only copied values → a blank row → nothing to save.
        fireEvent.press(getByText('Save'));
        expect(mockedSave).not.toHaveBeenCalled();
    });

    it('never saves an unconfirmed prefilled row as a record', async () => {
        const { findByTestId, getByTestId, getByText } = renderScreen();
        await waitFor(async () => expect((await findByTestId('rounds-ph-p1')).props.value).toBe('7.8'));
        fireEvent.changeText(getByTestId('rounds-ph-p2'), '8.0');

        fireEvent.press(getByText('Save 1 ponds'));

        await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
        expect(mockedSave.mock.calls[0][0].payload.pondId).toBe('p2');
    });

    it('stops on a review sheet for copied values in a submitted row, and saves only once confirmed', async () => {
        const { findByTestId, getByTestId, getByText, findByTestId: find } = renderScreen();
        await waitFor(async () => expect((await findByTestId('rounds-ph-p1')).props.value).toBe('7.8'));
        fireEvent.changeText(getByTestId('rounds-temperature-p1'), '29');

        fireEvent.press(getByText('Save 1 ponds'));

        expect(await find('rounds-review')).toBeTruthy();
        expect(getByTestId('rounds-review-edit-ph-p1')).toBeTruthy();
        expect(getByTestId('rounds-review-edit-dissolvedOxygen-p1')).toBeTruthy();
        await act(async () => new Promise((r) => setTimeout(r, 20)));
        expect(mockedSave).not.toHaveBeenCalled();

        fireEvent.press(getByText("These are today's readings"));

        await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
        expect(mockedSave.mock.calls[0][0].payload).toMatchObject({
            pondId: 'p1',
            ph: 7.8,
            dissolvedOxygen: 5.1,
            temperature: 29,
        });
    });

    it('editing a copied value makes it the farmer’s own — no review needed for it', async () => {
        mockedSnapshot.mockResolvedValue({
            contexts: [ctx('p1', { ph: 7.8, phAsOf: LAST, recordedAt: LAST })],
            briefing: [],
            moltWindow: null,
        });
        const { findByTestId, getByTestId, getByText, queryByTestId } = renderScreen();
        await waitFor(async () => expect((await findByTestId('rounds-ph-p1')).props.value).toBe('7.8'));

        fireEvent.changeText(getByTestId('rounds-ph-p1'), '7.9');
        fireEvent.press(getByText('Save 1 ponds'));

        await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
        expect(queryByTestId('rounds-review')).toBeNull();
        expect(mockedSave.mock.calls[0][0].payload).toMatchObject({ pondId: 'p1', ph: 7.9 });
    });

    it('a row can be confirmed as-is, which makes it a record', async () => {
        const { findByTestId, getByText } = renderScreen();
        fireEvent.press(await findByTestId('rounds-confirm-p1'));

        fireEvent.press(getByText('Save 1 ponds'));

        await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
        expect(mockedSave.mock.calls[0][0].payload).toMatchObject({ pondId: 'p1', ph: 7.8, dissolvedOxygen: 5.1 });
    });

    it('"Clear prefilled" empties the copied cells', async () => {
        const { findByTestId, getByTestId } = renderScreen();
        await waitFor(async () => expect((await findByTestId('rounds-ph-p1')).props.value).toBe('7.8'));

        fireEvent.press(getByTestId('rounds-clear-prefilled'));

        expect(getByTestId('rounds-ph-p1').props.value).toBe('');
        expect(getByTestId('rounds-dissolvedOxygen-p1').props.value).toBe('');
    });

    it('a restored draft keeps confirmed values confirmed', async () => {
        await seedDraft({
            p1: {
                cells: { ph: { v: '7.8', prefillAt: LAST, ok: true } },
                editedAt: new Date().toISOString(),
            },
        });
        const { findByTestId, getByText, queryByTestId } = renderScreen();
        await findByTestId('rounds-draft-banner');
        // DO is still an unconfirmed copy — confirm the row's remaining copy
        // would re-prompt; ph alone must not.
        fireEvent.press(await findByTestId('rounds-clear-prefilled'));

        fireEvent.press(getByText('Save 1 ponds'));

        await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
        expect(queryByTestId('rounds-review')).toBeNull();
        expect(mockedSave.mock.calls[0][0].payload).toMatchObject({ pondId: 'p1', ph: 7.8 });
    });
});

describe('keyboard', () => {
    it('scrolls a lower row into view when one of its cells is focused', async () => {
        const utils = renderScreen();
        const row = await utils.findByTestId('rounds-row-p3');
        fireEvent(row, 'layout', { nativeEvent: { layout: { x: 0, y: 600, width: 390, height: 60 } } });
        const scroll = utils.UNSAFE_getAllByType(ScrollView)[0].instance as any;
        scroll.scrollTo.mockClear();

        fireEvent(utils.getByTestId('rounds-dissolvedOxygen-p3'), 'focus');

        expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 536, animated: true });
    });
});
