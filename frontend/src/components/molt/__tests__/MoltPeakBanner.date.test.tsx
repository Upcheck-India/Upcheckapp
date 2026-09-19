// M2 §4: a planned harvest date reads its molt phase; pre-molt days (shells
// still hard) don't warn.
jest.mock('../../../api/molt', () => ({
    moltApi: {
        windows: jest.fn(async () => ({
            data: [{ key: 'w', kind: 'full', preStart: '2026-09-25', peakStart: '2026-09-27', peakDate: '2026-09-28', peakEnd: '2026-09-29', postEnd: '2026-10-01' }],
        })),
    },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { MoltPeakBanner } from '../MoltPeakBanner';

const banner = (date: string) => <MoltPeakBanner messageKey="harvestPlans.moltWindowWarning" date={date} />;

describe('MoltPeakBanner — planned date', () => {
    it('a peak day says so', async () => {
        const { findByText } = render(banner('2026-09-28'));
        expect(await findByText(/is a molt peak day/)).toBeTruthy();
    });

    it('a post day says it is just after the peak', async () => {
        const { findByText } = render(banner('2026-09-30'));
        expect(await findByText(/just after a molt peak/)).toBeTruthy();
    });

    it('a pre day shows nothing (windows loaded: a peak banner beside it renders)', async () => {
        const { queryAllByText, findByText } = render(<>{banner('2026-09-25')}{banner('2026-09-29')}</>);
        await findByText(/is a molt peak day/);
        expect(queryAllByText(/Molt window/)).toHaveLength(1);
    });
});
