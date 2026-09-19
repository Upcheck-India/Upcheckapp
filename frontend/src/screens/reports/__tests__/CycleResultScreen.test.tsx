// H3 Cycle Result + disease §3.1 welfare: "not logged" never reads as 0,
// money only when the server sent it, and "Next cycle" is absent when no
// real delta applies.
jest.mock('../../../api/reports', () => ({ reportsApi: { getCycleResult: jest.fn() } }));
jest.mock('../../../api/treatments', () => ({ treatmentsApi: { compliance: jest.fn() } }));
jest.mock('../../../features/remoteFlags', () => ({ useFlag: () => true }));
jest.mock('../../../hooks/usePermissions', () => ({ usePermissions: () => ({ canStartCycle: true }) }));
jest.mock('@react-navigation/native', () => ({
    useFocusEffect: (effect: any) => {
        const React = require('react');
        React.useEffect(effect, [effect]);
    },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CycleResultScreen } from '../CycleResultScreen';
import { reportsApi } from '../../../api/reports';
import { treatmentsApi } from '../../../api/treatments';

const METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const RESULT = {
    cropId: 'crop-1',
    pondId: 'pond-1',
    farmId: 'farm-1',
    pondName: 'Pond 3',
    status: 'completed',
    closeReason: null,
    lost: false,
    stockingDate: '2026-06-01',
    endDate: '2026-09-10',
    doc: 102,
    stockedCount: 100000,
    harvestedKg: 980,
    yield: { tPerHa: 4.9, areaAssumed: false },
    survival: { pct: 70, low: null, high: null, estimated: false },
    srBand: 'fair',
    feedKg: 1250,
    untaggedFeedLogs: 0,
    fcr: 1.28,
    fcrBand: 'good',
    avgCount: 42,
    gradeMix: [],
    adgGPerDay: 0.23,
    stockingAbwAssumedG: 0.01,
    money: { revenue: 407000, cost: 295000, profit: 112000, marginPct: 27.5, breakEvenPricePerKg: 301 },
    nextCycle: [],
    welfare: {
        doBelow3Days: { days: 0, of: 3 },
        nh3CriticalDays: null,
        handlingInMoltPeak: 0,
        diseases: [],
        biosecurity: null,
        seedPcr: null,
    },
    growthChart: [],
};

const navigation = { goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() };
const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <CycleResultScreen route={{ params: { cropId: 'crop-1' } }} navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('CycleResultScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (treatmentsApi.compliance as jest.Mock).mockResolvedValue({ data: { status: 'none_logged', items: [] } });
    });

    it('renders the hero, tiles, profit and the welfare facts', async () => {
        (reportsApi.getCycleResult as jest.Mock).mockResolvedValue({ data: RESULT });
        const { findByText, getByText, queryByTestId } = renderScreen();

        await findByText('Pond 3 · 102 days · 980 kg · 4.9 t/ha');
        expect(getByText('Profit ₹1,12,000')).toBeTruthy();
        expect(getByText('1.28')).toBeTruthy();
        expect(getByText('Good · Feed turned into shrimp well')).toBeTruthy();
        expect(getByText('Bands typical for vannamei in India, not calibrated to your farm')).toBeTruthy();
        // Logged and zero is a fact; not logged is not zero.
        expect(getByText('0 of 3 logged days')).toBeTruthy();
        expect(getByText('0 days')).toBeTruthy();
        expect(getByText('None recorded')).toBeTruthy();
        expect(await findByText('None recorded in Neerani')).toBeTruthy();
        // nh3, biosecurity and seed PCR were never logged.
        expect(queryByTestId('next-cycle')).toBeNull();
    });

    it('says "not logged" — never 0 — for everything the server returned null', async () => {
        (reportsApi.getCycleResult as jest.Mock).mockResolvedValue({
            data: {
                ...RESULT,
                fcr: null,
                fcrBand: null,
                survival: null,
                srBand: null,
                welfare: {
                    doBelow3Days: null,
                    nh3CriticalDays: null,
                    handlingInMoltPeak: null,
                    diseases: null,
                    biosecurity: null,
                    seedPcr: null,
                },
            },
        });
        (treatmentsApi.compliance as jest.Mock).mockRejectedValue(new Error('offline'));
        const { findAllByText, queryByText } = renderScreen();
        // FCR, survival tile, welfare survival, DO, NH3, handling, antimicrobial,
        // biosecurity, seed PCR, disease.
        expect((await findAllByText('not logged')).length).toBeGreaterThanOrEqual(10);
        expect(queryByText(/0 of/)).toBeNull();
        expect(queryByText('0 days')).toBeNull();
    });

    it('shows an estimated survival as a range with its tag', async () => {
        (reportsApi.getCycleResult as jest.Mock).mockResolvedValue({
            data: { ...RESULT, survival: { pct: 50, low: 45.5, high: 55.6, estimated: true } },
        });
        const { findAllByText, getByText } = renderScreen();
        expect((await findAllByText('45.5–55.6%')).length).toBe(2); // tile + welfare row
        expect(getByText('estimated')).toBeTruthy();
    });

    it('hides money without VIEW_FINANCIALS (server sends null)', async () => {
        (reportsApi.getCycleResult as jest.Mock).mockResolvedValue({ data: { ...RESULT, money: null } });
        const { findByText, queryByText } = renderScreen();
        await findByText('Pond 3 · 102 days · 980 kg · 4.9 t/ha');
        expect(queryByText(/Profit|Loss|Revenue/)).toBeNull();
    });

    it('renders Next cycle lines only when the server found a real delta', async () => {
        (reportsApi.getCycleResult as jest.Mock).mockResolvedValue({
            data: {
                ...RESULT,
                nextCycle: [{ key: 'softShellMolt', params: { kg: 12 } }],
            },
        });
        const { findByTestId, getByText } = renderScreen();
        await findByTestId('next-cycle');
        expect(getByText(/Rejected 12 kg soft-shell/)).toBeTruthy();
    });

    it('a lost crop reads "Crop lost", not ₹0 revenue', async () => {
        (reportsApi.getCycleResult as jest.Mock).mockResolvedValue({
            data: { ...RESULT, lost: true, closeReason: 'lost', harvestedKg: 0, yield: null },
        });
        const { findByText, queryByText } = renderScreen();
        await findByText('Crop lost');
        expect(queryByText(/980 kg/)).toBeNull();
    });

    it('Start next cycle REPLACES this report with CreateCycle, so saving returns to the pond', async () => {
        (reportsApi.getCycleResult as jest.Mock).mockResolvedValue({ data: RESULT });
        const { findByText } = renderScreen();
        fireEvent.press(await findByText('Start next cycle'));
        expect(navigation.replace).toHaveBeenCalledWith('CreateCycle', { pondId: 'pond-1' });
        expect(navigation.navigate).not.toHaveBeenCalledWith('CreateCycle', expect.anything());
    });
});
