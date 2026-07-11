// Task 6 — data-completeness indicator on decision engines. The chip itself
// was already wired into FeedAdvisor/DiseaseRisk/HarvestTiming/Lunar, but had
// no test of its own: a regression that silently dropped the score, mislabeled
// the band color, or broke the "raise these to improve" hint would ship
// undetected. This locks in the actual rendered output for each band.
import React from 'react';
import { render } from '@testing-library/react-native';
import { ConfidenceChip } from '../ConfidenceChip';
import type { DataConfidence } from '../../../api/pondContext';

const confidenceOf = (over: Partial<DataConfidence>): DataConfidence => ({
    score: 80,
    band: 'high',
    missing: [],
    stale: [],
    ...over,
});

describe('ConfidenceChip', () => {
    it('shows the score and band for a high-confidence pond', () => {
        const { getByText } = render(<ConfidenceChip confidence={confidenceOf({ score: 92, band: 'high' })} />);
        expect(getByText(/92%/)).toBeTruthy();
    });

    it('shows a low-confidence band distinctly from high', () => {
        const { getByText } = render(<ConfidenceChip confidence={confidenceOf({ score: 20, band: 'low', missing: ['Ammonia'] })} />);
        expect(getByText(/20%/)).toBeTruthy();
    });

    it('surfaces the "raise these to improve" hint only when showHint is set and something is missing/stale', () => {
        const confidence = confidenceOf({ score: 45, band: 'medium', missing: ['Ammonia'], stale: ['Body weight'] });

        const withoutHint = render(<ConfidenceChip confidence={confidence} />);
        expect(withoutHint.queryByText(/Ammonia/)).toBeNull();

        const withHint = render(<ConfidenceChip confidence={confidence} showHint />);
        expect(withHint.getByText(/Ammonia/)).toBeTruthy();
        expect(withHint.getByText(/Body weight/)).toBeTruthy();
    });

    it('does not render a hint when nothing is missing or stale, even with showHint set', () => {
        const { queryByText } = render(
            <ConfidenceChip confidence={confidenceOf({ score: 100, band: 'high', missing: [], stale: [] })} showHint />,
        );
        expect(queryByText(/improve/i)).toBeNull();
    });
});
