// A step whose days are over cannot be done any more: it is history, greyed
// under a divider, with nothing to press.
let mockData: any;
const mockNavigate = jest.fn();
jest.mock('../../../query/hooks', () => ({
    useAppQuery: () => ({ data: mockData }),
    useRefetchOnFocus: () => undefined,
}));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../MoltPeakBanner', () => ({ useMoltWindows: () => ({ data: [] }) }));

import React from 'react';
import { render, within } from '@testing-library/react-native';
import { MoltChecklist } from '../MoltPanels';

const WINDOW = {
    key: '2026-09-11-new', kind: 'new', preStart: '2026-09-08', peakStart: '2026-09-10',
    peakDate: '2026-09-11', peakEnd: '2026-09-12', postEnd: '2026-09-14',
};
const pond = (items: any[]) => ({
    pondId: 'p1', window: WINDOW, phase: 'post', eligible: true, sizeUnknown: false, abwG: 12, items, pendingCritical: 0,
});

describe('MoltChecklist', () => {
    it('shows missed steps greyed under "Earlier in this window", without buttons', () => {
        mockData = pond([
            { key: 'restore_feed', phase: 'post', priority: 'important', status: 'pending', source: 'manual', actionable: true },
            { key: 'feed_cut', phase: 'peak', priority: 'critical', status: 'missed', source: 'auto', route: 'FeedLog', actionable: false },
            { key: 'no_handling', phase: 'peak', priority: 'critical', status: 'violated', source: 'auto', actionable: false },
        ]);
        const { getByText, getByTestId } = render(<MoltChecklist pondId="p1" cropId="c1" />);

        expect(getByText('Earlier in this window')).toBeTruthy();
        expect(within(getByTestId('molt-item-restore_feed')).getByText('Mark done')).toBeTruthy();
        const missed = getByTestId('molt-item-feed_cut');
        expect(within(missed).getByText(/Missed/)).toBeTruthy();
        expect(within(missed).queryByText('Log it')).toBeNull();
        expect(within(getByTestId('molt-item-no_handling')).queryByRole('button')).toBeNull();
    });

    it('treats a step with no actionable flag (older backend) as doable', () => {
        mockData = pond([
            { key: 'minerals', phase: 'pre', priority: 'important', status: 'pending', source: 'auto', route: 'ChemicalLog' },
        ]);
        const { getByText, queryByText } = render(<MoltChecklist pondId="p1" cropId="c1" />);
        expect(getByText('Log it')).toBeTruthy();
        expect(queryByText('Earlier in this window')).toBeNull();
    });

    it('disables a chemical log until the cycle is known', () => {
        mockData = pond([
            { key: 'minerals', phase: 'pre', priority: 'important', status: 'pending', source: 'auto', route: 'ChemicalLog', actionable: true },
        ]);
        const { getByRole } = render(<MoltChecklist pondId="p1" cropId={null} />);
        expect(getByRole('button').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    });
});
