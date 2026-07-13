// #34 — entering a pond count on Create Farm saved it as a target
// (plannedPondCount) but never created any Pond rows, so Farm Detail showed
// no ponds at all. The fix routes into this existing per-pond wizard with
// totalPonds pre-filled instead of fabricating placeholder ponds. This test
// covers the "copy to all" addition: filling in Pond 1 once and applying it
// to the rest of a multi-pond batch, rather than re-entering identical
// shape/size/species/stocking data totalPonds times.
jest.mock('../../../api/reference', () => ({
    referenceApi: {
        getAllSpecies: jest.fn(async () => ({ data: [] })),
        getAllBroodstocks: jest.fn(async () => ({ data: [] })),
        getAllHatcheries: jest.fn(async () => ({ data: [] })),
    },
}));
jest.mock('../../../api/ponds', () => ({
    pondsApi: { create: jest.fn() },
}));
jest.mock('../../../api/crops', () => ({
    cropsApi: { create: jest.fn() },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PondSetupScreen } from '../PondSetupScreen';
import { pondsApi } from '../../../api/ponds';
import { cropsApi } from '../../../api/crops';

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const mockedPondsCreate = pondsApi.create as jest.Mock;
const mockedCropsCreate = cropsApi.create as jest.Mock;

const navigation = { reset: jest.fn() };

const renderScreen = (totalPonds: number) =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <PondSetupScreen
                navigation={navigation}
                route={{ params: { farmId: 'farm-1', totalPonds } }}
            />
        </SafeAreaProvider>,
    );

describe('PondSetupScreen — copy Pond 1 to the rest of a multi-pond batch (#34)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedPondsCreate.mockResolvedValue({
            data: { pond: { id: 'pond-1' }, calculatedAreaM2: 400 },
        });
        mockedCropsCreate.mockResolvedValue({ data: { id: 'crop-1' } });
    });

    it('only shows the "copy to all" option on Pond 1 of a batch of more than one', async () => {
        const { queryByText, findByText, rerender } = renderScreen(3);
        expect(await findByText('Use these same details for all 3 ponds')).toBeTruthy();

        rerender(
            <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
                <PondSetupScreen navigation={navigation} route={{ params: { farmId: 'farm-1', totalPonds: 1 } }} />
            </SafeAreaProvider>,
        );
        expect(queryByText(/Use these same details for all/)).toBeNull();
    });

    it('creates all N ponds + crops from Pond 1\'s values when "copy to all" is checked', async () => {
        const { getByText, getByPlaceholderText, getAllByPlaceholderText, findByPlaceholderText } = renderScreen(3);

        fireEvent.changeText(await findByPlaceholderText('e.g. A1'), 'North');
        const [lengthInput, widthInput] = getAllByPlaceholderText('0.0');
        fireEvent.changeText(lengthInput, '20');
        fireEvent.changeText(widthInput, '10');
        fireEvent.changeText(getByPlaceholderText('0.5 – 5.0'), '1.5');
        fireEvent.changeText(getByPlaceholderText('e.g. 40'), '10');

        fireEvent.press(getByText('Use these same details for all 3 ponds'));
        fireEvent.press(getByText('Finish setup'));

        await waitFor(() => expect(mockedPondsCreate).toHaveBeenCalledTimes(3));
        expect(mockedCropsCreate).toHaveBeenCalledTimes(3);
        expect(navigation.reset).toHaveBeenCalled();

        // Distinct names for ponds 2 and 3; pond 1 keeps the entered name.
        expect(mockedPondsCreate.mock.calls[0][0].displayName).toBe('North');
        expect(mockedPondsCreate.mock.calls[1][0].displayName).toBe('North 2');
        expect(mockedPondsCreate.mock.calls[2][0].displayName).toBe('North 3');
    });

    it('falls back to the one-by-one flow if copying to the rest fails partway through', async () => {
        mockedPondsCreate
            .mockResolvedValueOnce({ data: { pond: { id: 'pond-1' }, calculatedAreaM2: 400 } })
            .mockRejectedValueOnce(new Error('network error'));

        const { getByText, getByPlaceholderText, getAllByPlaceholderText, findByPlaceholderText } = renderScreen(3);

        fireEvent.changeText(await findByPlaceholderText('e.g. A1'), 'North');
        const [lengthInput, widthInput] = getAllByPlaceholderText('0.0');
        fireEvent.changeText(lengthInput, '20');
        fireEvent.changeText(widthInput, '10');
        fireEvent.changeText(getByPlaceholderText('0.5 – 5.0'), '1.5');
        fireEvent.changeText(getByPlaceholderText('e.g. 40'), '10');

        fireEvent.press(getByText('Use these same details for all 3 ponds'));
        fireEvent.press(getByText('Finish setup'));

        // Pond 1 succeeded, pond 2 failed — the wizard drops back to a normal
        // per-pond step (Pond 2 of 3) instead of silently stopping.
        await waitFor(() => expect(getByText('Pond 2 of 3')).toBeTruthy());
        expect(navigation.reset).not.toHaveBeenCalled();
    });
});
