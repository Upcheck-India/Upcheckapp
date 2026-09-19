/**
 * D6 / H2 — the disease picker must work with no signal. It reads the library
 * through the persisted TanStack cache, so a library fetched earlier (the pond
 * dashboard prefetches it) is there offline, and the record saves to the queue.
 */
jest.mock('../../../api/diseases', () => ({
    diseaseApi: { getAllDiseases: jest.fn(), update: jest.fn() },
}));
jest.mock('../../../api/healthObservations', () => ({
    ...jest.requireActual('../../../api/healthObservations'),
    healthObservationsApi: { listForPond: jest.fn(), uploadPhoto: jest.fn(), save: jest.fn() },
}));
jest.mock('../../../sync/recordSync', () => ({ saveRecord: jest.fn(), drainRecordQueue: jest.fn().mockResolvedValue(undefined) }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-image-manipulator', () => ({ SaveFormat: { JPEG: 'jpeg' } }));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DiseaseLogScreen } from '../DiseaseLogScreen';
import { diseaseApi } from '../../../api/diseases';
import { healthObservationsApi } from '../../../api/healthObservations';
import { saveRecord } from '../../../sync/recordSync';
import { qk, queryClient, shouldDehydrateQuery } from '../../../query/client';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const navigation = { goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() };
const WSSV = { id: 'd-wssv', name: 'WSSV' };

const renderScreen = (params: any = {}) =>
    render(
        <SafeAreaProvider initialMetrics={METRICS}>
            <DiseaseLogScreen navigation={navigation} route={{ params: { pondId: 'p1', pondName: 'P1', cropId: 'c1', ...params } }} />
        </SafeAreaProvider>,
    );

describe('DiseaseLogScreen offline (D6/H2)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        queryClient.clear();
        // No signal: the library fetch fails with no response.
        (diseaseApi.getAllDiseases as jest.Mock).mockRejectedValue(new Error('Network Error'));
        (healthObservationsApi.listForPond as jest.Mock).mockRejectedValue(new Error('Network Error'));
        (saveRecord as jest.Mock).mockResolvedValue({ id: 'r1', queued: true });
    });

    it('the library is a persisted root', () => {
        queryClient.setQueryData(qk.diseaseLibrary('en'), [WSSV]);
        const q = queryClient.getQueryCache().find({ queryKey: qk.diseaseLibrary('en') })!;
        expect(shouldDehydrateQuery(q)).toBe(true);
    });

    it('picks from the cached library with no signal and queues the record', async () => {
        queryClient.setQueryData(qk.diseaseLibrary('en'), [WSSV]);
        const utils = renderScreen();
        fireEvent.press(await utils.findByTestId('disease-d-wssv'));
        fireEvent.press(utils.getByText('Save Record'));
        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        expect((saveRecord as jest.Mock).mock.calls[0][0]).toMatchObject({
            entity: 'disease',
            endpoint: '/disease/record',
            payload: { cropId: 'c1', diseaseId: 'd-wssv' },
        });
    });

    it('H4: a disease passed from the library is preselected', async () => {
        queryClient.setQueryData(qk.diseaseLibrary('en'), [WSSV, { id: 'd-wfd', name: 'WFD' }]);
        const utils = renderScreen({ diseaseId: 'd-wfd' });
        await utils.findByTestId('disease-d-wfd');
        fireEvent.press(utils.getByText('Save Record'));
        await waitFor(() => expect(saveRecord).toHaveBeenCalled());
        expect((saveRecord as jest.Mock).mock.calls[0][0].payload.diseaseId).toBe('d-wfd');
    });
});
