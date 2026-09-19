// H4 — one revenue path: a plan's "Mark complete" opens this form prefilled,
// and the harvest save carries `planId` so the server completes the plan in
// the same transaction. The plan never books income of its own.
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
    pondContextApi: { get: jest.fn().mockResolvedValue({ data: {} }) },
}));
jest.mock('../../../sync/recordSync', () => ({
    saveRecord: jest.fn(),
    drainRecordQueue: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-1' }));
const permissions = { canViewFinancials: true };
jest.mock('../../../hooks/usePermissions', () => ({ usePermissions: () => permissions }));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HarvestLogScreen } from '../HarvestLogScreen';
import { saveRecord } from '../../../sync/recordSync';
import { useUIStore } from '../../../store/uiStore';

const METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const navigation = { goBack: jest.fn() };
const fromPlan = (prefill: any) => ({
    pondId: 'pond-1',
    pondName: 'Pond 1',
    cropId: 'crop-1',
    planId: 'plan-1',
    harvestType: 'full',
    prefill,
});
const renderScreen = (params: any) =>
    render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <HarvestLogScreen route={{ params }} navigation={navigation} />
        </SafeAreaProvider>,
    );
/** Presses the confirm button of every Alert (the full-harvest question). */
const confirmAll = () =>
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[buttons.length - 1]?.onPress?.());

describe('HarvestLogScreen — H4 plan → harvest', () => {
    afterEach(() => jest.restoreAllMocks());
    beforeEach(() => {
        jest.clearAllMocks();
        useUIStore.setState({ toasts: [] });
        (saveRecord as jest.Mock).mockResolvedValue({ id: 'uuid-1', queued: false });
    });

    it('prefills from the plan and sends planId with the full harvest', async () => {
        confirmAll();
        const { getByText } = renderScreen(fromPlan({ date: '2026-08-01', targetKg: 500, expectedPrice: 280 }));

        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        const { payload } = (saveRecord as jest.Mock).mock.calls[0][0];
        expect(payload).toEqual(
            expect.objectContaining({
                id: 'uuid-1',
                cropId: 'crop-1',
                planId: 'plan-1',
                harvestType: 'full',
                harvestDate: '2026-08-01',
                grades: [expect.objectContaining({ weightKg: 500, pricePerKg: 280 })],
            }),
        );
    });

    it("a plan dated in the future prefills today's date, not the plan's", async () => {
        confirmAll();
        const { getByText } = renderScreen(fromPlan({ date: '2099-01-01', targetKg: 500 }));

        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        expect((saveRecord as jest.Mock).mock.calls[0][0].payload.harvestDate).not.toBe('2099-01-01');
    });

    // The server never refuses the harvest over its plan (offline safety): it
    // saves it unlinked and returns planLink. The farmer is told, not blocked.
    it('a plan completed elsewhere: harvest saved, warning toast points at Money', async () => {
        (saveRecord as jest.Mock).mockResolvedValue({
            id: 'uuid-1',
            queued: false,
            data: { id: 'uuid-1', planLink: 'already_completed' },
        });
        confirmAll();
        const { getByText } = renderScreen(fromPlan({ date: '2026-08-01', targetKg: 500, expectedPrice: 280 }));

        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() =>
            expect(useUIStore.getState().toasts).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'warning',
                        message: 'Harvest saved. The plan was already completed on another device — check Money for a possible duplicate.',
                    }),
                ]),
            ),
        );
        expect(navigation.goBack).toHaveBeenCalled();
    });

    it('a linked save shows the plain success toast', async () => {
        (saveRecord as jest.Mock).mockResolvedValue({ id: 'uuid-1', queued: false, data: { planLink: 'linked' } });
        confirmAll();
        const { getByText } = renderScreen(fromPlan({ date: '2026-08-01', targetKg: 500, expectedPrice: 280 }));

        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
        expect(useUIStore.getState().toasts.some((t) => t.type === 'warning')).toBe(false);
    });

    it('a plain harvest (no plan) sends no planId', async () => {
        confirmAll();
        const { getByText, getByPlaceholderText } = renderScreen({ pondId: 'pond-1', pondName: 'Pond 1', cropId: 'crop-1' });

        fireEvent.changeText(getByPlaceholderText('e.g. 1500'), '900');
        fireEvent.press(getByText('Save Harvest'));

        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        expect((saveRecord as jest.Mock).mock.calls[0][0].payload).not.toHaveProperty('planId');
    });
});
