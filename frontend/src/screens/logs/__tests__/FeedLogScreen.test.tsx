// Quick-mode regression test for the Feed log (USER_PERSPECTIVE_PRODUCT_ANALYSIS
// §Part 2 row #2, Task 5 follow-up): feeding-tray leftover checks are a
// supplementary observation, not required to log a feed amount, so they're
// collapsed behind an "Add feeding-tray check" toggle by default — the core
// daily entry is just amount + type.
jest.mock('../../../sync/recordSync', () => ({
    saveRecord: jest.fn(),
    drainRecordQueue: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeedLogScreen } from '../FeedLogScreen';
import { saveRecord } from '../../../sync/recordSync';

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
            <FeedLogScreen route={route} navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('FeedLogScreen — tray checks collapsed by default', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedSaveRecord.mockResolvedValue({ id: 'rec-1', queued: false });
    });

    it('hides the 4 tray fields until "Add feeding-tray check" is tapped', () => {
        const { getByText, queryByText } = renderScreen();

        expect(getByText('Total Feed Given (kg)')).toBeTruthy();
        expect(queryByText('Tray 1')).toBeNull();
        expect(queryByText('Tray 4')).toBeNull();

        fireEvent.press(getByText('Add feeding-tray check'));

        expect(getByText('Tray 1')).toBeTruthy();
        expect(getByText('Tray 4')).toBeTruthy();
        expect(getByText('Hide feeding-tray check')).toBeTruthy();
    });

    it('saves a feed log without ever opening the tray section', async () => {
        const { getByText, getByPlaceholderText } = renderScreen();

        fireEvent.changeText(getByPlaceholderText('0.0'), '12.5');
        fireEvent.press(getByText('Save Record'));

        await waitFor(() =>
            expect(mockedSaveRecord).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({ quantityKg: 12.5 }),
                }),
            ),
        );
    });
});
