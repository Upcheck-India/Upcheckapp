// Molting status on Today, driven by the server's molt window (true phase,
// IST dates) — the same window the alerts and pond checklists use.
//
// The row earns its weight rather than being given it — loud inside the
// window, one quiet line naming the next window outside it.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LunarRow } from '../LunarRow';
import type { MoltWindowSummary } from '../../../api/molt';

const SEP = {
    key: '2026-09-11-new',
    kind: 'new' as const,
    preStart: '2026-09-08',
    peakStart: '2026-09-10',
    peakDate: '2026-09-11',
    peakEnd: '2026-09-12',
    postEnd: '2026-09-14',
};
const LATE_SEP = { ...SEP, key: '2026-09-26-full', kind: 'full' as const, preStart: '2026-09-23', peakDate: '2026-09-26', postEnd: '2026-09-29' };

const inWindow: MoltWindowSummary = {
    window: SEP,
    phase: 'peak',
    next: LATE_SEP,
    eligiblePonds: 5,
    pondsWithPending: 2,
};
const quiet: MoltWindowSummary = { window: null, phase: 'inter', next: LATE_SEP, eligiblePonds: 5, pondsWithPending: 0 };

describe('LunarRow', () => {
    it('inside a window names the dates, the peak and how many ponds need action', () => {
        const { getByText } = render(<LunarRow moltWindow={inWindow} />);

        // ICU renders en-IN September as "Sep" or "Sept" depending on its data.
        expect(getByText(/Molt window 8 Sept? – 14 Sept? · peak 11 Sept?$/)).toBeTruthy();
        expect(getByText('2 of 5 ponds need action')).toBeTruthy();
    });

    it('inside a window with no eligible ponds, states the consequence', () => {
        const { getByText } = render(<LunarRow moltWindow={{ ...inWindow, eligiblePonds: 0, pondsWithPending: 0 }} />);

        expect(getByText(/Feed less/)).toBeTruthy();
    });

    it('outside a window is one quiet line naming the next window', () => {
        const { queryByText, getByText } = render(<LunarRow moltWindow={quiet} />);

        expect(queryByText(/Molt window/)).toBeNull();
        expect(getByText(/Next molt window from 23 Sep/)).toBeTruthy();
    });

    it('with no server window (older backend), shows only the phase — no invented molt warning', () => {
        const { queryByText } = render(<LunarRow moltWindow={null} />);

        expect(queryByText(/Molt window/)).toBeNull();
        expect(queryByText(/illuminated/i)).toBeTruthy();
    });

    it('opens the lunar screen when given a handler', () => {
        const onPress = jest.fn();
        const { getByRole } = render(<LunarRow moltWindow={quiet} onPress={onPress} />);

        fireEvent.press(getByRole('button'));

        expect(onPress).toHaveBeenCalled();
    });

    it('announces the window by text rather than reading out the glyph', () => {
        const { getByLabelText } = render(<LunarRow moltWindow={inWindow} />);

        expect(getByLabelText(/2 of 5 ponds need action/)).toBeTruthy();
    });
});
