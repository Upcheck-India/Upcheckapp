// Renaming or re-siting a farm changes what every member of it sees, so the
// edit path asks first. Cancelling must not PATCH.
jest.mock('../../../api/farms', () => ({
    farmsApi: { getById: jest.fn(), update: jest.fn(), create: jest.fn() },
}));
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
    getCurrentPositionAsync: jest.fn(),
    Accuracy: { Balanced: 3 },
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

const navigation = { goBack: jest.fn(), navigate: jest.fn(), reset: jest.fn() };
const route = { params: { editFarmId: 'farm-1' } };

const FARM = { id: 'farm-1', name: 'Delta Farm', address: 'Kakinada', areaHectares: 3 };

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <CreateFarmScreen route={route} navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('CreateFarmScreen — confirm before saving an edit', () => {
    afterEach(() => jest.restoreAllMocks());
    beforeEach(() => {
        jest.clearAllMocks();
        (farmsApi.getById as jest.Mock).mockResolvedValue({ data: FARM });
    });

    it('does not PATCH when the confirmation is cancelled', async () => {
        const alert = jest
            .spyOn(Alert, 'alert')
            .mockImplementation((_t, _m, buttons) => buttons?.[0].onPress?.());

        const { getByText, findByDisplayValue } = renderScreen();
        await findByDisplayValue('Delta Farm');

        fireEvent.press(getByText('Save'));

        await waitFor(() => expect(alert).toHaveBeenCalled());
        expect(alert.mock.calls[0][0]).toBe('Save these changes?');
        expect(farmsApi.update).not.toHaveBeenCalled();
    });

    it('PATCHes once confirmed', async () => {
        (farmsApi.update as jest.Mock).mockResolvedValue({ data: FARM });
        jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1].onPress?.());

        const { getByText, findByDisplayValue } = renderScreen();
        await findByDisplayValue('Delta Farm');

        fireEvent.press(getByText('Save'));

        await waitFor(() => expect(farmsApi.update).toHaveBeenCalledWith('farm-1', expect.anything()));
    });

    // The backend keeps non-shift farm fields owner-only; a manager sending the
    // whole form would be refused even for a shift change.
    it('a manager PATCHes only shift fields; an unknown role still sends the form', async () => {
        const { useMembershipStore } = require('../../../store/membershipStore');
        (farmsApi.update as jest.Mock).mockResolvedValue({ data: FARM });
        jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1].onPress?.());

        const grant = jest.spyOn(useMembershipStore.getState(), 'grantForFarm');
        grant.mockReturnValue({ role: 'manager', overrides: null, policy: null } as any);
        const manager = renderScreen();
        await manager.findByDisplayValue('Delta Farm');
        fireEvent.press(manager.getByText('Save'));
        await waitFor(() => expect(farmsApi.update).toHaveBeenCalled());
        expect(Object.keys((farmsApi.update as jest.Mock).mock.calls[0][1])).not.toContain('name');
        manager.unmount();

        (farmsApi.update as jest.Mock).mockClear();
        grant.mockReturnValue({ role: null, overrides: null, policy: null } as any);
        const unknown = renderScreen();
        await unknown.findByDisplayValue('Delta Farm');
        fireEvent.press(unknown.getByText('Save'));
        await waitFor(() => expect(farmsApi.update).toHaveBeenCalled());
        expect((farmsApi.update as jest.Mock).mock.calls[0][1]).toMatchObject({ name: 'Delta Farm' });
    });
});
