// M2 pre-harvest check: computed lines from molt windows, soft-shell
// observations and the cycle's compliance read; the cast-net prompt saves a
// sampling-source observation through saveRecord (offline-safe).
jest.mock('../../../api/molt', () => ({ moltApi: { windows: jest.fn() } }));
jest.mock('../../../api/healthObservations', () => ({
    ...jest.requireActual('../../../api/healthObservations'),
    healthObservationsApi: { listForPond: jest.fn(), save: jest.fn() },
}));
jest.mock('../../../api/treatments', () => ({ treatmentsApi: { compliance: jest.fn() } }));
jest.mock('../../../utils/localDate', () => ({
    ...jest.requireActual('../../../utils/localDate'),
    todayLocalISODate: () => '2026-10-02',
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PreHarvestCheck } from '../PreHarvestCheck';
import { moltApi } from '../../../api/molt';
import { healthObservationsApi } from '../../../api/healthObservations';
import { treatmentsApi } from '../../../api/treatments';
import { queryClient } from '../../../query/client';

const W = {
    key: 'w', kind: 'full', preStart: '2026-09-25', peakStart: '2026-09-27', peakDate: '2026-09-28', peakEnd: '2026-09-29', postEnd: '2026-10-01',
};

describe('PreHarvestCheck', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        queryClient.clear();
        (moltApi.windows as jest.Mock).mockResolvedValue({ data: [W] });
        (healthObservationsApi.listForPond as jest.Mock).mockResolvedValue({ data: [] });
        (treatmentsApi.compliance as jest.Mock).mockResolvedValue({ data: { status: 'none_logged', items: [] } });
        (healthObservationsApi.save as jest.Mock).mockResolvedValue({ queued: true });
    });

    it('shows the red residues line from the compliance endpoint', async () => {
        (treatmentsApi.compliance as jest.Mock).mockResolvedValue({
            data: { status: 'banned_logged', items: [{ date: '2026-08-12', source: 'treatment', recordId: 'r', substances: ['Chloramphenicol'], flag: 'banned' }] },
        });
        const { findByTestId, getByText } = render(<PreHarvestCheck pondId="p1" cropId="c1" date="2026-10-10" />);
        await findByTestId('check-residues-red');
        expect(treatmentsApi.compliance).toHaveBeenCalledWith('c1');
        expect(getByText(/A banned substance \(Chloramphenicol\) was logged/)).toBeTruthy();
    });

    it('all clean → "Ready to harvest"', async () => {
        const { findByText } = render(<PreHarvestCheck pondId="p2" cropId="c2" date="2026-10-10" />);
        expect(await findByText('Ready to harvest')).toBeTruthy();
    });

    it('the cast-net prompt saves a sampling observation (offline-safe) and turns the line green', async () => {
        const { findByTestId, getByTestId, getByText } = render(<PreHarvestCheck pondId="p3" cropId="c3" date="2026-10-02" />);
        await findByTestId('check-soft-amber');

        fireEvent.changeText(getByTestId('check-soft-count'), '2');
        fireEvent.press(getByText('Save'));

        await waitFor(() =>
            expect(healthObservationsApi.save).toHaveBeenCalledWith({
                pondId: 'p3',
                cropId: 'c3',
                observedOn: '2026-10-02',
                source: 'sampling',
                sampleSize: 50,
                signs: [{ sign: 'soft_shell', level: 'few', count: 2 }],
            }),
        );
        await findByTestId('check-ready-green');
    });
});
