// Spec 2026-09-19 D8: bands (never a percentage), disclaimer first, ≥2 signs,
// "from your logs" prefill that can be unticked, lab sheet on every result,
// "Log this in pond" → D6 disease form prefilled, library link by stable key.
jest.mock('../../../features/diseaseLibrary', () => ({
    useDiseaseLibrary: () => ({
        data: [{ id: 'lib-wssv', name: 'WSSV', scientificName: 'White Spot Syndrome Virus', commonNames: ['White Spot'] }],
    }),
}));
jest.mock('../../../api/healthObservations', () => ({
    healthObservationsApi: { listForPond: jest.fn() },
}));
// The real picker fetches ponds; this stand-in picks 'p1' (with a running cycle) on press.
jest.mock('../../../components/ui/PondPicker', () => {
    const { Text } = require('react-native');
    return {
        PondPicker: ({ onChange }: any) => (
            <Text onPress={() => onChange('p1', { pondId: 'p1', cropId: 'c1', species: 'vannamei', waterQuality: null, freeAmmoniaMgL: null })}>
                pick-pond
            </Text>
        ),
    };
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DiagnoseScreen } from '../DiagnoseScreen';
import { healthObservationsApi } from '../../../api/healthObservations';

const listForPond = healthObservationsApi.listForPond as jest.Mock;

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <DiagnoseScreen route={{ params: {} }} navigation={navigation} />
        </SafeAreaProvider>,
    );
const run = (getAllByText: any) => {
    const b = getAllByText('Diagnose');
    fireEvent.press(b[b.length - 1]);
};

describe('DiagnoseScreen — honest diagnosis', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        listForPond.mockResolvedValue({ data: [] });
    });

    it('shows the disclaimer before any result', () => {
        const { getByText } = renderScreen();
        expect(getByText('This suggests what to check. It cannot diagnose. Confirm with a lab.')).toBeTruthy();
    });

    it('needs 2 signs: one sign gives no result', () => {
        const { getByText, getAllByText, queryByText } = renderScreen();
        fireEvent.press(getByText('Black / dark gills'));
        run(getAllByText);
        expect(getByText('Pick at least 2 signs.')).toBeTruthy();
        expect(queryByText('What to check')).toBeNull();
    });

    it('shows a band and a localised name, never a percentage; every result offers the lab sheet', () => {
        const { getByText, getAllByText, queryByText, toJSON } = renderScreen();
        ['White spots on shell', 'Reduced feeding', 'Lethargy', 'Swimming at surface / edges'].forEach((s) => fireEvent.press(getByText(s)));
        run(getAllByText);
        expect(getByText('White Spot Syndrome (WSSV)')).toBeTruthy();
        expect(getAllByText('Strong match').length).toBeGreaterThan(0);
        expect(JSON.stringify(toJSON())).not.toMatch(/\d+%/);
        const labButtons = getAllByText('Confirm with a lab (PCR)');
        expect(labButtons.length).toBeGreaterThanOrEqual(2);
        fireEvent.press(labButtons[0]);
        expect(getByText(/Do not send dead shrimp/)).toBeTruthy();
        expect(queryByText(/antibiotic/i)).toBeNull();
    });

    it('deep-links to the library row by stable key', () => {
        const { getByText, getAllByText } = renderScreen();
        ['White spots on shell', 'Reduced feeding', 'Lethargy'].forEach((s) => fireEvent.press(getByText(s)));
        run(getAllByText);
        fireEvent.press(getAllByText('View')[0]);
        expect(navigation.navigate).toHaveBeenCalledWith('DiseaseDetail', { diseaseId: 'lib-wssv' });
    });

    it('pre-ticks signs from the pond logs, labelled, and lets the farmer untick them', async () => {
        listForPond.mockResolvedValue({ data: [{ sign: 'white_spots', level: 'few' }] });
        const { getByText, getAllByText, findByText } = renderScreen();
        fireEvent.press(getAllByText('pick-pond')[0]);
        const chip = await findByText('White spots on shell (from your logs)');
        expect(getByText(/come from this pond's last 3 days/)).toBeTruthy();
        expect(listForPond).toHaveBeenCalledWith('p1', 3);
        // Untick it: with one more sign only, there are fewer than 2 → no run.
        fireEvent.press(chip);
        fireEvent.press(getByText('Lethargy'));
        run(getAllByText);
        expect(getByText('Pick at least 2 signs.')).toBeTruthy();
    });

    it('"Log this in pond" opens the D6 disease form prefilled', async () => {
        listForPond.mockResolvedValue({ data: [] });
        const { getByText, getAllByText } = renderScreen();
        fireEvent.press(getAllByText('pick-pond')[0]);
        await waitFor(() => expect(listForPond).toHaveBeenCalled());
        ['White spots on shell', 'Reduced feeding', 'Red discoloration'].forEach((s) => fireEvent.press(getByText(s)));
        run(getAllByText);
        fireEvent.press(getAllByText('Log this in pond')[0]);
        expect(navigation.navigate).toHaveBeenCalledWith('DiseaseLog', {
            pondId: 'p1',
            cropId: 'c1',
            diseaseId: 'lib-wssv',
            signs: ['white_spots', 'red_body'],
        });
    });
});
