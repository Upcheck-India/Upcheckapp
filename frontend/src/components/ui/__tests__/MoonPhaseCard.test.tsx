import React from 'react';
import { render } from '@testing-library/react-native';
import { MoonPhaseCard } from '../MoonPhaseCard';

function utc(y: number, m: number, d: number, h = 0): Date {
    return new Date(Date.UTC(y, m - 1, d, h));
}

describe('MoonPhaseCard', () => {
    it('renders the current phase name and illumination', () => {
        const { getByText } = render(<MoonPhaseCard date={utc(2024, 1, 25, 18)} />);
        expect(getByText('Full Moon')).toBeTruthy();
        expect(getByText(/% illuminated/)).toBeTruthy();
    });

    it('shows the molting hint near a full moon', () => {
        const { getByText } = render(<MoonPhaseCard date={utc(2024, 1, 25, 18)} />);
        expect(getByText(/Molting window/)).toBeTruthy();
    });

    it('hides the molting hint at the first quarter', () => {
        const { queryByText } = render(<MoonPhaseCard date={utc(2024, 1, 18)} />);
        expect(queryByText(/Molting window/)).toBeNull();
    });
});
