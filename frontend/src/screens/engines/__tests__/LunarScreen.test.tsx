// Founder report: keyboard hid the ABW field, "No pond data" showed forever
// when opened without a pond, and the risk ignored pond readings.
jest.mock('../../../api/lunar', () => ({
    lunarApi: { phase: jest.fn(), risk: jest.fn() },
}));
jest.mock('../../../api/ponds', () => ({ pondsApi: { getMine: jest.fn() } }));
jest.mock('../../../api/pondContext', () => ({ pondContextApi: { get: jest.fn() } }));
jest.mock('../../../components/molt/MoltPanels', () => ({
    MoltTimeline: () => null,
    MoltChecklist: () => null,
    MoltPondList: () => null,
}));
jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual('@react-navigation/native');
    return {
        ...actual,
        useFocusEffect: (effect: () => void) => {
            const React = require('react');
            React.useEffect(effect, [effect]);
        },
    };
});

import React from 'react';
import { Keyboard, ScrollView } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LunarScreen } from '../LunarScreen';
import { lunarApi } from '../../../api/lunar';
import { pondsApi } from '../../../api/ponds';
import { pondContextApi } from '../../../api/pondContext';
import { queryClient } from '../../../query/client';

const METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderScreen = (params: Record<string, string> = {}) =>
    render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <LunarScreen route={{ params }} />
        </SafeAreaProvider>,
    );

const ctx = {
    doc: 40, cropId: 'c1', abwG: 14, biomassKg: null, areaM2: null, crop: null,
    waterQuality: { dissolvedOxygen: 3.5 }, freeAmmoniaMgL: null, latestTrayResidue: null,
    confidence: { score: 70, band: 'medium', missing: [], stale: [] },
};
const riskResponse = {
    data: {
        phase: { phase: 0, illumination: 0, name: 'New' },
        risk: { moltPressure: 1, vulnerability: 0.5, score: 70, band: 'Critical', phaseRel: 'peak', vulnerabilityKnown: 1, vulnerabilityTotal: 8 },
        playbook: null,
    },
};
const pond = (id: string, name: string, active = true) =>
    ({ id, farmId: 'f1', name, displayName: name, activeCycleId: active ? `crop-${id}` : null });

beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    (lunarApi.phase as jest.Mock).mockRejectedValue(new Error('offline'));
    (lunarApi.risk as jest.Mock).mockResolvedValue(riskResponse);
    (pondContextApi.get as jest.Mock).mockResolvedValue({ data: ctx });
});

describe('LunarScreen — pond selector', () => {
    it('picking a pond loads its context, prefills ABW and sends its readings', async () => {
        (pondsApi.getMine as jest.Mock).mockResolvedValue({ data: [pond('p1', 'North'), pond('p2', 'South'), pond('p3', 'Dry', false)] });
        const { findByText, queryByText, getByTestId } = renderScreen();

        fireEvent.press(await findByText('South'));
        expect(queryByText('Dry')).toBeNull(); // no active cycle, not offered

        await waitFor(() => expect(pondContextApi.get).toHaveBeenCalledWith('p2'));
        await waitFor(() => expect(getByTestId('lunar-abw').props.value).toBe('14'));
        await waitFor(() => expect(lunarApi.risk).toHaveBeenCalledWith({ abwG: 14, vulnerability: { do: 3.5 } }));
        expect(await findByText('Based on 1 of 8 pond readings')).toBeTruthy();
        expect(queryByText('Manual estimate — choose a pond to use its readings')).toBeNull();
    });

    it('auto-selects when the user has exactly one active pond', async () => {
        (pondsApi.getMine as jest.Mock).mockResolvedValue({ data: [pond('p1', 'North')] });
        renderScreen();
        await waitFor(() => expect(pondContextApi.get).toHaveBeenCalledWith('p1'));
    });

    it('no pond selected → neutral manual-estimate line, never the red "No pond data" chip', async () => {
        (pondsApi.getMine as jest.Mock).mockResolvedValue({ data: [pond('p1', 'North'), pond('p2', 'South')] });
        const { findByText, getByTestId, queryByTestId, queryByText } = renderScreen();
        await findByText('North');

        fireEvent.changeText(getByTestId('lunar-abw'), '12');
        fireEvent.press(await findByText('Assess'));

        expect(await findByText('Manual estimate — choose a pond to use its readings')).toBeTruthy();
        expect(queryByTestId('confidence-none')).toBeNull();
        expect(queryByText('No pond data')).toBeNull();
        expect(lunarApi.risk).toHaveBeenCalledWith({ abwG: 12, vulnerability: undefined });
        expect(pondContextApi.get).not.toHaveBeenCalled();
    });
});

describe('LunarScreen — keyboard', () => {
    it('focusing the ABW field scrolls the assessment card into view once the keyboard is up', async () => {
        (pondsApi.getMine as jest.Mock).mockResolvedValue({ data: [] });
        const listeners: Record<string, () => void> = {};
        jest.spyOn(Keyboard, 'addListener').mockImplementation(((evt: string, cb: () => void) => {
            listeners[evt] = cb;
            return { remove: jest.fn() };
        }) as any);
        const scrollTo = ScrollView.prototype.scrollTo as jest.Mock;

        const { getByTestId } = renderScreen();
        fireEvent(getByTestId('lunar-abw'), 'focus');
        expect(listeners.keyboardDidShow).toBeDefined();

        scrollTo.mockClear();
        act(() => listeners.keyboardDidShow());
        expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ animated: true }));
    });
});
