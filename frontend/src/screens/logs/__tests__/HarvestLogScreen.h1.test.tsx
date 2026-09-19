// H1/H2: the graded harvest form. Grades ride inside ONE saveRecord payload
// (one idempotent replay), numbers parse locale-safely, prices never leave a
// member without VIEW_FINANCIALS, a full harvest asks before closing the
// cycle, and deleting a full harvest says it reopens the cycle.
jest.mock('../../../api/harvests', () => ({
    harvestsApi: { update: jest.fn(), create: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../../api/ponds', () => ({
    pondsApi: { getById: jest.fn().mockResolvedValue({ data: { id: 'pond-1', farmId: 'farm-1' } }) },
}));
jest.mock('../../../api/crops', () => ({
    ...jest.requireActual('../../../api/crops'),
    cropsApi: { getById: jest.fn().mockResolvedValue({ data: { id: 'crop-1', stockingDate: '2026-06-03' } }) },
}));
jest.mock('../../../api/pondContext', () => ({
    pondContextApi: { get: jest.fn().mockResolvedValue({ data: { abwG: 25, samplingAt: '2026-09-14T00:00:00Z' } }) },
}));
jest.mock('../../../sync/recordSync', () => ({
    saveRecord: jest.fn(),
    drainRecordQueue: jest.fn().mockResolvedValue(undefined),
}));
let mockUuidN = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockUuidN}` }));
const permissions = { canViewFinancials: true };
jest.mock('../../../hooks/usePermissions', () => ({ usePermissions: () => permissions }));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HarvestLogScreen } from '../HarvestLogScreen';
import { saveRecord } from '../../../sync/recordSync';
import { harvestsApi } from '../../../api/harvests';

const METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const navigation = { goBack: jest.fn(), replace: jest.fn() };
const renderScreen = (params: any = {}) =>
    render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <HarvestLogScreen
                route={{ params: { pondId: 'pond-1', pondName: 'Pond 1', cropId: 'crop-1', ...params } }}
                navigation={navigation}
            />
        </SafeAreaProvider>,
    );
/** Alert.alert stub that presses the button at `index` (0 = cancel, 1 = confirm). */
const answer = (index: number) =>
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[index]?.onPress?.());

describe('HarvestLogScreen — H1 graded form', () => {
    afterEach(() => jest.restoreAllMocks());
    beforeEach(() => {
        jest.clearAllMocks();
        permissions.canViewFinancials = true;
        (saveRecord as jest.Mock).mockResolvedValue({ id: 'x', queued: true });
    });

    it('sends grades inside the one saveRecord payload, parsing "1,500" as 1500', async () => {
        const { getByText, getAllByLabelText } = renderScreen();
        // The count prefill from the latest ABW (25 g → 40/kg) is labelled, not silent.
        await waitFor(() => expect(getByText(/Count 40\/kg is from the/)).toBeTruthy());

        fireEvent.changeText(getAllByLabelText('kg')[0], '1,500');
        fireEvent.changeText(getAllByLabelText('₹/kg')[0], '430');
        fireEvent.press(getByText('Add grade'));
        fireEvent.changeText(getAllByLabelText('kg')[1], '160');
        fireEvent.changeText(getAllByLabelText('count/kg')[1], '55');
        fireEvent.changeText(getAllByLabelText('₹/kg')[1], '340');
        fireEvent.press(getByText('Partial')); // no type is pre-selected any more
        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() => expect(saveRecord).toHaveBeenCalledTimes(1));
        const { payload } = (saveRecord as jest.Mock).mock.calls[0][0];
        expect(payload.id).toMatch(/^uuid-/);
        expect(payload.harvestType).toBe('partial');
        expect(payload.grades).toEqual([
            { weightKg: 1500, countPerKg: 40, pricePerKg: 430 },
            { weightKg: 160, countPerKg: 55, pricePerKg: 340 },
        ]);
        expect(payload.weightKg).toBeUndefined(); // the server derives it
    });

    it('without VIEW_FINANCIALS: no price column, no price sent', async () => {
        permissions.canViewFinancials = false;
        const { getByText, getAllByLabelText, queryAllByLabelText } = renderScreen();
        expect(queryAllByLabelText('₹/kg')).toHaveLength(0);

        fireEvent.changeText(getAllByLabelText('kg')[0], '900');
        fireEvent.press(getByText('Partial')); // no type is pre-selected any more
        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        const { payload } = (saveRecord as jest.Mock).mock.calls[0][0];
        expect('pricePerKg' in payload.grades[0]).toBe(false);
        expect(payload.buyerName).toBeUndefined();
    });

    it('an out-of-band price is confirmed, then sent with confirmOutOfRange', async () => {
        const alert = answer(1);
        const { getByText, getAllByLabelText } = renderScreen();
        fireEvent.changeText(getAllByLabelText('kg')[0], '100');
        fireEvent.changeText(getAllByLabelText('₹/kg')[0], '4300');
        fireEvent.press(getByText('Partial')); // no type is pre-selected any more
        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        expect(alert.mock.calls[0][0]).toBe('Unusual price');
        expect((saveRecord as jest.Mock).mock.calls[0][0].payload.confirmOutOfRange).toBe(true);
    });

    it('a full harvest asks before closing the cycle; cancel saves nothing', async () => {
        const alert = answer(0);
        const { getByText, getAllByLabelText } = renderScreen();
        await waitFor(() => expect(getByText(/Count 40/)).toBeTruthy());
        fireEvent.press(getByText('Full (Close Cycle)'));
        fireEvent.changeText(getAllByLabelText('kg')[0], '980');
        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() => expect(alert).toHaveBeenCalled());
        expect(alert.mock.calls[0][0]).toBe('Close this cycle?');
        expect(alert.mock.calls[0][1]).toContain('Pond 1');
        expect(saveRecord).not.toHaveBeenCalled();
    });

    it.each([
        [false, 'opens the Cycle Result'],
        [true, 'goes back (nothing on the server yet)'],
    ])('a saved full harvest (queued=%s) %s', async (queued) => {
        answer(1);
        (saveRecord as jest.Mock).mockResolvedValue({ id: 'x', queued });
        const { getByText, getAllByLabelText } = renderScreen();
        fireEvent.press(getByText('Full (Close Cycle)'));
        fireEvent.changeText(getAllByLabelText('kg')[0], '980');
        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        if (queued) {
            await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
            expect(navigation.replace).not.toHaveBeenCalled();
        } else {
            await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('CycleResult', { cropId: 'crop-1' }));
            expect(navigation.goBack).not.toHaveBeenCalled();
        }
    });

    it('a saved partial harvest just goes back', async () => {
        (saveRecord as jest.Mock).mockResolvedValue({ id: 'x', queued: false });
        const { getByText, getAllByLabelText } = renderScreen();
        fireEvent.changeText(getAllByLabelText('kg')[0], '200');
        fireEvent.press(getByText('Partial')); // no type is pre-selected any more
        fireEvent.press(getByText('Save Harvest'));
        await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
        expect(navigation.replace).not.toHaveBeenCalled();
    });

    it('a new harvest has no type pre-selected: save is blocked until Partial or Full is chosen', async () => {
        const { getByText, getAllByLabelText, queryByTestId, findByTestId } = renderScreen();
        fireEvent.changeText(getAllByLabelText('kg')[0], '1000');
        fireEvent.press(getByText('Save Harvest'));
        expect(await findByTestId('harvest-type-required')).toHaveTextContent('Choose Partial or Full before saving.');
        expect(saveRecord).not.toHaveBeenCalled();

        fireEvent.press(getByText('Partial'));
        expect(queryByTestId('harvest-type-required')).toBeNull();
        fireEvent.press(getByText('Save Harvest'));
        await waitFor(() => expect(saveRecord).toHaveBeenCalledTimes(1));
        expect((saveRecord as jest.Mock).mock.calls[0][0].payload.harvestType).toBe('partial');
    });

    it('a failed online save retried reuses the same harvest id', async () => {
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        (saveRecord as jest.Mock).mockRejectedValueOnce({ response: { status: 500 } });
        const { getByText, getAllByLabelText } = renderScreen();
        fireEvent.changeText(getAllByLabelText('kg')[0], '900');
        fireEvent.press(getByText('Partial')); // no type is pre-selected any more
        fireEvent.press(getByText('Save Harvest'));
        await waitFor(() => expect(saveRecord).toHaveBeenCalledTimes(1));
        fireEvent.press(getByText('Save Harvest'));
        await waitFor(() => expect(saveRecord).toHaveBeenCalledTimes(2));
        const ids = (saveRecord as jest.Mock).mock.calls.map((c) => c[0].payload.id);
        expect(ids[0]).toBe(ids[1]);
    });
});

describe('HarvestLogScreen — H1/H2 edit', () => {
    const editRecord = {
        id: 'h1',
        harvestDate: '2026-09-01',
        weightKg: 980,
        harvestType: 'full',
        buyerName: 'Sri Balaji',
        salePriceTotal: 407000,
        grades: [
            { id: 'g1', weightKg: 820, countPerKg: 40, pricePerKg: 430 },
            { id: 'g2', weightKg: 160, countPerKg: 55, pricePerKg: 340 },
        ],
    };
    afterEach(() => jest.restoreAllMocks());
    beforeEach(() => {
        jest.clearAllMocks();
        permissions.canViewFinancials = true;
    });

    it('type is read-only; replace-all grades keep ids; a cleared buyer is sent as null', async () => {
        answer(1);
        (harvestsApi.update as jest.Mock).mockResolvedValue({ data: {} });
        const { getByText, getByDisplayValue } = renderScreen({ editRecord });
        expect(getByText('Wrong type? Delete this harvest and log it again.')).toBeTruthy();
        expect(getByText('Partial')).toBeDisabled(); // immutable after create (H2)
        fireEvent.press(getByText('Partial'));

        fireEvent.changeText(getByDisplayValue('Sri Balaji'), '');
        fireEvent.press(getByText('Update'));

        await waitFor(() => expect(harvestsApi.update).toHaveBeenCalled());
        const [, payload] = (harvestsApi.update as jest.Mock).mock.calls[0];
        expect(payload.harvestType).toBeUndefined();
        expect(payload.grades.map((g: any) => g.id)).toEqual(['g1', 'g2']);
        expect(payload.buyerName).toBeNull();
    });

    it('deleting a full harvest warns it reopens the cycle; a newer cycle is explained', async () => {
        const alert = answer(1);
        (harvestsApi.delete as jest.Mock).mockRejectedValue({ response: { status: 409, data: { code: 'POND_HAS_NEW_CYCLE' } } });
        const { getByText } = renderScreen({ editRecord });

        fireEvent.press(getByText('Delete harvest'));

        await waitFor(() => expect(harvestsApi.delete).toHaveBeenCalledWith('h1'));
        expect(alert.mock.calls[0][1]).toBe('Deleting this reopens the cycle.');
        await waitFor(() =>
            expect(alert.mock.calls[1][1]).toBe("A new cycle has started on this pond; this harvest can't be removed."),
        );
    });
});
