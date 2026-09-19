/**
 * D5 — the CycleDetail checklist: progress count, ticks through saveRecord,
 * a viewer cannot tick, and the whole panel stays hidden until the backend
 * migration is applied (`available: false`).
 */
jest.mock('@react-navigation/native', () => {
    const { useEffect } = jest.requireActual('react');
    return { useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});
jest.mock('../../../api/biosecurity', () => ({
    ...jest.requireActual('../../../api/biosecurity'),
    biosecurityApi: { get: jest.fn(), setCheck: jest.fn(), setSeed: jest.fn() },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BiosecurityPanel } from '../BiosecurityPanel';
import { biosecurityApi, BIOSECURITY_ITEMS } from '../../../api/biosecurity';

const get = biosecurityApi.get as jest.Mock;
const setCheck = biosecurityApi.setCheck as jest.Mock;

const DONE = ['pond_dried', 'bottom_limed', 'water_filtered', 'bird_net', 'footbath'];
const data = (available = true) => ({
    cropId: 'c1',
    available,
    seed: { plSpf: true, plPcrDate: null, plPcrLab: null, plPcrResults: { wssv: 'negative', ehp: 'negative' } },
    items: BIOSECURITY_ITEMS.map((i) => ({ key: i.key, stage: i.stage, done: DONE.includes(i.key), doneOn: null, note: null })),
    done: DONE.length,
    total: 9,
});

const renderPanel = (canTick = true) =>
    render(<BiosecurityPanel cropId="c1" active canTick={canTick} canEditSeed={false} />);

beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({ data: data() });
    setCheck.mockResolvedValue({ id: 'x', queued: true });
});

it('shows progress "5 of 9"', async () => {
    const s = renderPanel();
    expect(await s.findByText('Biosecurity 5 of 9')).toBeTruthy();
});

it('a tick goes through setCheck and updates the count (queued offline too)', async () => {
    const s = renderPanel();
    await s.findByText('Biosecurity 5 of 9');
    fireEvent.press(s.getByTestId('bio-item-crab_fence'));
    expect(setCheck).toHaveBeenCalledWith('c1', { itemKey: 'crab_fence', done: true });
    expect(await s.findByText('Biosecurity 6 of 9')).toBeTruthy();
});

it('a viewer (no WRITE_OPERATIONAL) cannot tick', async () => {
    const s = renderPanel(false);
    await s.findByText('Biosecurity 5 of 9');
    fireEvent.press(s.getByTestId('bio-item-crab_fence'));
    expect(setCheck).not.toHaveBeenCalled();
});

it('renders nothing before the migration (once loaded)', async () => {
    get.mockResolvedValue({ data: data(false) });
    const s = renderPanel();
    await waitFor(() => expect(s.queryByTestId('bio-loading')).toBeNull());
    expect(s.queryByText(/Biosecurity/)).toBeNull();
    expect(s.queryByText('Seed health')).toBeNull();
});

it('shows a visible loading state for seed health + checklist until the fetch resolves', async () => {
    let resolve!: (v: unknown) => void;
    get.mockReturnValue(new Promise((r) => (resolve = r)));
    const s = renderPanel();
    expect(s.getByTestId('bio-loading')).toBeTruthy();
    expect(s.getByText('Loading seed health and biosecurity checklist…')).toBeTruthy();
    resolve({ data: data() });
    expect(await s.findByText('Seed health')).toBeTruthy();
    expect(s.queryByTestId('bio-loading')).toBeNull();
});

it('a failed fetch shows an error with retry instead of nothing', async () => {
    get.mockRejectedValueOnce(new Error('offline'));
    const s = renderPanel();
    expect(await s.findByTestId('bio-error')).toBeTruthy();
    fireEvent.press(s.getByText('Retry'));
    expect(await s.findByText('Biosecurity 5 of 9')).toBeTruthy();
});

it('each item says what it is and why, and the score is marked self-reported', async () => {
    const s = renderPanel();
    await s.findByText('Biosecurity 5 of 9');
    expect(s.getByText(/Sunlight kills germs left from the last crop/)).toBeTruthy();
    expect(s.getByText('You tick these yourself — Upcheck does not check them.')).toBeTruthy();
});
