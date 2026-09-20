// C0.2 (spec 2026-09-20 compliance): a farm saves with district and no
// coordinates; a cleared location persists as an explicit null, not just an
// omitted field (buildDraft() could not express that before this change).
jest.mock('../../../api/farms', () => ({
    farmsApi: { getById: jest.fn(), update: jest.fn(), create: jest.fn() },
}));
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
    getCurrentPositionAsync: jest.fn(),
    reverseGeocodeAsync: jest.fn(),
    Accuracy: { Low: 1, Balanced: 3 },
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CreateFarmScreen } from '../CreateFarmScreen';
import { farmsApi } from '../../../api/farms';

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderScreen = (route: any) =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <CreateFarmScreen
                route={route}
                navigation={{ goBack: jest.fn(), navigate: jest.fn(), reset: jest.fn() }}
            />
        </SafeAreaProvider>,
    );

describe('CreateFarmScreen — district location (C0.2)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('creates a farm with a district and no coordinates', async () => {
        (farmsApi.create as jest.Mock).mockResolvedValue({ data: { id: 'f1' } });

        const { getByText, getByPlaceholderText } = renderScreen({ params: {} });
        fireEvent.changeText(getByPlaceholderText('What you call this farm'), 'North Site');

        // District picker: open state list, pick Andhra Pradesh, then a district.
        fireEvent.press(getByText('Choose your district'));
        await waitFor(() => expect(getByText('Andhra Pradesh')).toBeTruthy());
        fireEvent.press(getByText('Andhra Pradesh'));
        await waitFor(() => expect(getByText('Krishna')).toBeTruthy());
        fireEvent.press(getByText('Krishna'));

        fireEvent.press(getByText('Save Farm'));

        await waitFor(() => expect(farmsApi.create).toHaveBeenCalled());
        const dto = (farmsApi.create as jest.Mock).mock.calls[0][0];
        expect(dto.stateCode).toBe('AP');
        expect(dto.districtCode).toBe('AP-KRISHNA');
        expect(dto.latitude).toBeUndefined();
        expect(dto.longitude).toBeUndefined();
    });

    it('clears a previously-set location as an explicit null on edit', async () => {
        (farmsApi.getById as jest.Mock).mockResolvedValue({
            data: {
                id: 'farm-1',
                name: 'Delta Farm',
                stateCode: 'AP',
                districtCode: 'AP-KRISHNA',
                latitude: 16.51,
                longitude: 80.65,
            },
        });
        (farmsApi.update as jest.Mock).mockResolvedValue({ data: {} });
        // Edit confirms via Alert.alert first — press the confirm button.
        jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1].onPress?.());

        const { getByText, findByDisplayValue } = renderScreen({ params: { editFarmId: 'farm-1' } });
        await findByDisplayValue('Delta Farm');

        fireEvent.press(getByText('Clear location'));
        fireEvent.press(getByText('Save'));

        await waitFor(() => expect(farmsApi.update).toHaveBeenCalled());
        const dto = (farmsApi.update as jest.Mock).mock.calls[0][1];
        expect(dto.stateCode).toBeNull();
        expect(dto.districtCode).toBeNull();
        expect(dto.latitude).toBeNull();
        expect(dto.longitude).toBeNull();
    });
});
