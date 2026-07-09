// Quick-mode regression test (USER_PERSPECTIVE_PRODUCT_ANALYSIS §Part 2 row
// #2): the daily water-quality log used to show all 10 numeric fields at
// once. Now only pH/DO/temperature show by default, the rest are behind an
// "Add more readings" toggle, and slow-changing fields (salinity/alkalinity/
// hardness/transparency) are pre-filled from the farmer's last reading so
// they don't have to re-type the same number every visit.
jest.mock('../../../api/waterQuality', () => ({
    waterQualityApi: { getLatest: jest.fn() },
}));
jest.mock('../../../sync/recordSync', () => ({
    saveRecord: jest.fn(),
    // OfflineIndicator (rendered by every ScreenWrapper) also calls this on
    // reconnect — unrelated to what this test exercises, but must exist.
    drainRecordQueue: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WaterQualityLogScreen } from '../WaterQualityLogScreen';
import { waterQualityApi } from '../../../api/waterQuality';
import { saveRecord } from '../../../sync/recordSync';

const mockedGetLatest = waterQualityApi.getLatest as jest.Mock;
const mockedSaveRecord = saveRecord as jest.Mock;

// See src/screens/inventory/__tests__/InventoryListScreen.test.tsx for why:
// react-native-safe-area-context's initialWindowMetrics is statically null
// outside a native runtime, so SafeAreaProvider needs explicit fake metrics.
const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { goBack: jest.fn() };
const route = { params: { pondId: 'pond-1', pondName: 'Pond 1' } };

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <WaterQualityLogScreen route={route} navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('WaterQualityLogScreen — quick mode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedSaveRecord.mockResolvedValue({ id: 'rec-1', queued: false });
    });

    it('shows only pH/DO/temperature by default; the rest are behind "Add more readings"', async () => {
        mockedGetLatest.mockRejectedValue({ response: { status: 404 } }); // brand-new pond, no prior reading

        const { getByText, queryByText } = renderScreen();
        await waitFor(() => expect(mockedGetLatest).toHaveBeenCalledWith('pond-1'));

        expect(getByText('pH')).toBeTruthy();
        expect(getByText('DO (mg/L)')).toBeTruthy();
        expect(getByText('Temperature (°C)')).toBeTruthy();
        // Collapsed by default — these must not be on screen yet.
        expect(queryByText('Salinity (ppt)')).toBeNull();
        expect(queryByText('Ammonia (mg/L)')).toBeNull();

        fireEvent.press(getByText('Add more readings'));

        expect(getByText('Salinity (ppt)')).toBeTruthy();
        expect(getByText('Ammonia (mg/L)')).toBeTruthy();
        expect(getByText('Show fewer readings')).toBeTruthy();
    });

    it('pre-fills slow-changing fields from the last reading and submits them even while collapsed', async () => {
        mockedGetLatest.mockResolvedValue({
            data: { salinity: 18, alkalinity: 120, hardness: 300, transparency: 35 },
        });

        const { getByText } = renderScreen();
        await waitFor(() => expect(mockedGetLatest).toHaveBeenCalledWith('pond-1'));

        // Save immediately without ever opening "Add more readings" — the
        // whole point of pre-filling is that the farmer doesn't have to.
        fireEvent.press(getByText('Save Log'));

        await waitFor(() =>
            expect(mockedSaveRecord).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({
                        salinity: 18,
                        alkalinity: 120,
                        hardness: 300,
                        transparency: 35,
                    }),
                }),
            ),
        );
    });

    it('does not prefill and does not error when there is no prior reading (new pond, offline)', async () => {
        mockedGetLatest.mockRejectedValue({ message: 'Network Error' });

        const { getByText } = renderScreen();
        await waitFor(() => expect(mockedGetLatest).toHaveBeenCalledWith('pond-1'));

        fireEvent.press(getByText('Save Log'));

        await waitFor(() =>
            expect(mockedSaveRecord).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({
                        salinity: undefined,
                        alkalinity: undefined,
                        hardness: undefined,
                        transparency: undefined,
                    }),
                }),
            ),
        );
    });
});
