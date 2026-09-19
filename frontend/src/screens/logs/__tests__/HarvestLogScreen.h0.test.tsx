// H0: a harvest on a closed cycle is refused before anything is written, so
// the form must say so and NOT offer a retry; and the sale section is money,
// shown only to a member with VIEW_FINANCIALS.
jest.mock('../../../api/harvests', () => ({
    harvestsApi: { update: jest.fn(), create: jest.fn() },
}));
jest.mock('../../../api/ponds', () => ({
    pondsApi: { getById: jest.fn().mockResolvedValue({ data: { id: 'pond-1', farmId: 'farm-1' } }) },
}));
jest.mock('../../../sync/recordSync', () => ({
    saveRecord: jest.fn(),
    drainRecordQueue: jest.fn().mockResolvedValue(undefined),
}));
const permissions = { canViewFinancials: false };
jest.mock('../../../hooks/usePermissions', () => ({ usePermissions: () => permissions }));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HarvestLogScreen } from '../HarvestLogScreen';
import { saveRecord } from '../../../sync/recordSync';

const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { goBack: jest.fn() };
const route = { params: { pondId: 'pond-1', pondName: 'Pond 1', cropId: 'crop-1' } };

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <HarvestLogScreen route={route} navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('HarvestLogScreen — H0', () => {
    afterEach(() => jest.restoreAllMocks());
    beforeEach(() => {
        jest.clearAllMocks();
        permissions.canViewFinancials = false;
    });

    it('CYCLE_CLOSED: explains, offers no retry, and leaves the form', async () => {
        (saveRecord as jest.Mock).mockRejectedValue({
            response: { status: 409, data: { code: 'CYCLE_CLOSED' } },
        });
        const alert = jest
            .spyOn(Alert, 'alert')
            .mockImplementation((_t, _m, buttons) => buttons?.[0]?.onPress?.());

        const { getByText, getByPlaceholderText } = renderScreen();
        fireEvent.changeText(getByPlaceholderText('e.g. 1500'), '900');
        fireEvent.press(getByText('Partial')); // no type is pre-selected any more
        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() => expect(alert).toHaveBeenCalled());
        const [, message, buttons] = alert.mock.calls[0];
        expect(message).toBe('This cycle is already closed. The harvest was not saved.');
        expect(buttons).toHaveLength(1); // OK only — no "try again"
        expect(navigation.goBack).toHaveBeenCalled();
    });

    it('hides the sale section without VIEW_FINANCIALS, and sends no price', async () => {
        (saveRecord as jest.Mock).mockResolvedValue({ id: 'h1', queued: false });
        const { getByText, queryByText, getByPlaceholderText } = renderScreen();

        expect(queryByText('Sales Information (Optional)')).toBeNull();

        fireEvent.changeText(getByPlaceholderText('e.g. 1500'), '900');
        fireEvent.press(getByText('Partial')); // no type is pre-selected any more
        fireEvent.press(getByText('Save Harvest'));
        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        const { payload } = (saveRecord as jest.Mock).mock.calls[0][0];
        expect(payload.salePriceTotal).toBeUndefined();
        expect(payload.buyerName).toBeUndefined();
    });

    it('shows the sale section with VIEW_FINANCIALS', () => {
        permissions.canViewFinancials = true;
        const { getByText } = renderScreen();
        expect(getByText('Sales Information (Optional)')).toBeTruthy();
    });
});
