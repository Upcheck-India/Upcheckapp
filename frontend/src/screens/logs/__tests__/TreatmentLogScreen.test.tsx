// Structured treatment form (disease spec D2) + never-silent flag lowering (D3).
jest.mock('../../../sync/recordSync', () => ({
    saveRecord: jest.fn().mockResolvedValue({ id: 'x', queued: false }),
    drainRecordQueue: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../api/inventory', () => ({
    inventoryApi: { getAll: jest.fn().mockResolvedValue({ data: [] }) },
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TreatmentLogScreen } from '../TreatmentLogScreen';
import { saveRecord } from '../../../sync/recordSync';
import { useIngredientsStore } from '../../../features/ingredientsStore';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const names = (en: string, te = en) => ({ en, hi: en, te, ta: en, bn: en, or: en });
const INGREDIENTS = [
    { key: 'potassium_chloride', category: 'mineral', names: names('Potassium chloride (KCl / MOP)', 'పొటాషియం క్లోరైడ్'), aliases: ['kcl'] },
    { key: 'chloramphenicol', category: 'antimicrobial', bannedKey: 'chloramphenicol', names: names('Chloramphenicol', 'క్లోరాంఫెనికాల్'), aliases: ['chloramphenicol'] },
];

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const renderScreen = (params: Record<string, unknown> = {}) =>
    render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <TreatmentLogScreen route={{ params: { pondId: 'p1', pondName: 'Pond 3', cropId: 'c1', ...params } }} navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('TreatmentLogScreen (D2/D3)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useIngredientsStore.setState({ ingredients: INGREDIENTS as any, version: 't' });
    });
    afterEach(() => jest.restoreAllMocks());

    it('a Telugu search finds the ingredient, and a banned pick warns at once (before any dose)', async () => {
        const { getByPlaceholderText, getByText, queryByText } = renderScreen();
        expect(queryByText('Banned substance detected')).toBeNull();
        fireEvent.changeText(getByPlaceholderText('Search in any language, e.g. KCl'), 'క్లోరాం');
        fireEvent.press(getByText('Chloramphenicol'));
        expect(getByText('Banned substance detected')).toBeTruthy();
        expect(getByText(/This list may be incomplete/)).toBeTruthy();
    });

    it('the molt checklist prefills mineral / molt prep; the save carries the structured fields', async () => {
        jest.spyOn(Alert, 'alert');
        const { getByText } = renderScreen({ prefill: 'molt' });
        fireEvent.press(getByText('Potassium chloride (KCl / MOP)'));
        fireEvent.press(getByText('Save Record'));
        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        const args = (saveRecord as jest.Mock).mock.calls[0][0];
        expect(args).toMatchObject({ entity: 'treatment', endpoint: '/treatments' });
        expect(args.payload).toMatchObject({
            cropId: 'c1',
            category: 'mineral',
            reason: 'molt_prep',
            ingredientKeys: ['potassium_chloride'],
        });
    });

    it('a flagged save is never blocked: "Save anyway" still saves', async () => {
        jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
        const { getByText } = renderScreen();
        fireEvent.press(getByText('Chloramphenicol'));
        fireEvent.press(getByText('Save Record'));
        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        expect((saveRecord as jest.Mock).mock.calls[0][0].payload.ingredientKeys).toEqual(['chloramphenicol']);
    });

    it('an edit goes through the offline queue as a PATCH, with no "Product:" prefix', async () => {
        const editRecord = {
            id: 't-1', cropId: 'c1', treatmentDate: '2026-09-10', description: '', productName: 'Aqua Mix',
            notes: 'evening', category: 'mineral', ingredientKeys: ['potassium_chloride'], bannedSubstanceFlag: 'none',
        };
        const { getByText } = renderScreen({ editRecord });
        fireEvent.press(getByText('Update'));
        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        const args = (saveRecord as jest.Mock).mock.calls[0][0];
        expect(args).toMatchObject({ method: 'PATCH', endpoint: '/treatments/t-1' });
        expect(args.payload).toMatchObject({ id: 't-1', productName: 'Aqua Mix', notes: 'evening' });
        expect(JSON.stringify(args.payload)).not.toContain('Product:');
    });

    it('lowering a banned flag asks why, and sends the reason', async () => {
        const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[0]?.onPress?.());
        const editRecord = {
            id: 't-2', cropId: 'c1', treatmentDate: '2026-09-10', description: 'probiotic', notes: '',
            ingredientKeys: ['chloramphenicol'], bannedSubstanceFlag: 'banned', bannedSubstanceMatches: ['Chloramphenicol'],
        };
        const { getByText } = renderScreen({ editRecord });
        fireEvent.press(getByText('Chloramphenicol')); // un-pick it
        fireEvent.press(getByText('Update'));
        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        expect(alert.mock.calls[0][0]).toBe('Why are you changing this?');
        expect((saveRecord as jest.Mock).mock.calls[0][0].payload).toMatchObject({ flagChangeReason: 'typing_error', ingredientKeys: [] });
    });
});
