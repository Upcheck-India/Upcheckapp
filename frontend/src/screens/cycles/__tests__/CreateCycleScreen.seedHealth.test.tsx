/**
 * D5 — "Seed health" on CreateCycle is warn-only: an untested WSSV/EHP shows a
 * warning, a positive result asks once (red confirm), and the seed fields are
 * saved against the new cycle without ever failing the cycle itself.
 */
jest.mock('../../../api/crops', () => ({
    cropsApi: { getAll: jest.fn(), create: jest.fn() },
}));
jest.mock('../../../api/ponds', () => ({
    pondsApi: { getById: jest.fn(), getAll: jest.fn() },
}));
jest.mock('../../../api/biosecurity', () => ({
    ...jest.requireActual('../../../api/biosecurity'),
    biosecurityApi: { setSeed: jest.fn() },
}));
jest.mock('../../../utils/confirm', () => ({ confirm: jest.fn() }));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CreateCycleScreen } from '../CreateCycleScreen';
import { cropsApi } from '../../../api/crops';
import { pondsApi } from '../../../api/ponds';
import { biosecurityApi, seedWarning } from '../../../api/biosecurity';
import { confirm } from '../../../utils/confirm';

const create = cropsApi.create as jest.Mock;
const setSeed = biosecurityApi.setSeed as jest.Mock;
const mockedConfirm = confirm as jest.Mock;
const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <CreateCycleScreen navigation={navigation} route={{ params: { pondId: 'p1' } }} />
        </SafeAreaProvider>,
    );

/** Fill the required fields so Save reaches the create call. */
const fillRequired = async (s: ReturnType<typeof renderScreen>) => {
    fireEvent.changeText(s.getByLabelText('Stocking Count'), '100000');
    fireEvent.press(s.getByLabelText('Seed Type'));
    fireEvent.press(await s.findByText('PL-10'));
};

beforeEach(() => {
    jest.clearAllMocks();
    (cropsApi.getAll as jest.Mock).mockResolvedValue({ data: [] });
    (pondsApi.getById as jest.Mock).mockRejectedValue(new Error('offline'));
    create.mockResolvedValue({ data: { id: 'c1' } });
    setSeed.mockResolvedValue({ data: {} });
});

describe('seedWarning', () => {
    it('warns when WSSV or EHP is not tested or missing', () => {
        expect(seedWarning(null)).toBe('untested');
        expect(seedWarning({ wssv: 'negative' })).toBe('untested');
        expect(seedWarning({ wssv: 'negative', ehp: 'not_tested' })).toBe('untested');
        expect(seedWarning({ wssv: 'negative', ehp: 'negative' })).toBeNull();
    });
    it('any positive → positive', () => {
        expect(seedWarning({ wssv: 'negative', ehp: 'negative', ihhnv: 'positive' })).toBe('positive');
    });
});

describe('CreateCycleScreen — Seed health (D5)', () => {
    it('is collapsed by default and shows the untested warning when opened', async () => {
        const s = renderScreen();
        expect(s.queryByTestId('seed-warning-untested')).toBeNull();
        fireEvent.press(s.getByTestId('seed-health-toggle'));
        expect(s.getByTestId('seed-warning-untested')).toBeTruthy();
    });

    it('a positive result asks first; cancelling does not create the cycle', async () => {
        mockedConfirm.mockResolvedValue(false);
        const s = renderScreen();
        await fillRequired(s);
        fireEvent.press(s.getByTestId('seed-health-toggle'));
        fireEvent.press(s.getAllByText('Positive')[0]); // WSSV
        expect(s.getByTestId('seed-warning-positive')).toBeTruthy();
        fireEvent.press(s.getAllByText('Start Production Cycle').slice(-1)[0]);
        await waitFor(() => expect(mockedConfirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true })));
        expect(create).not.toHaveBeenCalled();
    });

    it('confirming stocks anyway and saves the seed fields on the new cycle', async () => {
        mockedConfirm.mockResolvedValue(true);
        const s = renderScreen();
        await fillRequired(s);
        fireEvent.press(s.getByTestId('seed-health-toggle'));
        fireEvent.press(s.getAllByText('Positive')[0]);
        fireEvent.press(s.getAllByText('Start Production Cycle').slice(-1)[0]);
        await waitFor(() =>
            expect(setSeed).toHaveBeenCalledWith('c1', expect.objectContaining({ plPcrResults: { wssv: 'positive' } })),
        );
        expect(navigation.goBack).toHaveBeenCalled();
    });

    it('no confirm and no seed call when the section was left untouched; a seed failure never fails the cycle', async () => {
        const s = renderScreen();
        await fillRequired(s);
        fireEvent.press(s.getAllByText('Start Production Cycle').slice(-1)[0]);
        await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
        expect(mockedConfirm).not.toHaveBeenCalled();
        expect(setSeed).not.toHaveBeenCalled();

        jest.clearAllMocks();
        create.mockResolvedValue({ data: { id: 'c2' } });
        setSeed.mockRejectedValue({ response: { status: 503 } });
        const s2 = renderScreen();
        await fillRequired(s2);
        fireEvent.press(s2.getByTestId('seed-health-toggle'));
        fireEvent.press(s2.getAllByText('Negative')[0]);
        fireEvent.press(s2.getAllByText('Start Production Cycle').slice(-1)[0]);
        await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
        expect(setSeed).toHaveBeenCalledWith('c2', expect.objectContaining({ plPcrResults: { wssv: 'negative' } }));
    });
});
