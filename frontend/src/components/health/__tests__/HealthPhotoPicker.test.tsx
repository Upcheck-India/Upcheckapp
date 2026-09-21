/**
 * P2: the ✕ on a thumbnail removes it locally, and — only for a photo
 * uploaded this session that never made it onto a saved record — deletes
 * the just-uploaded object too. An already-saved photo is just dropped from
 * the draft array; its own record's next save is what deletes it server
 * side (see mortality/disease service specs for that half).
 */
jest.mock('../../../api/healthObservations', () => ({
    healthObservationsApi: {
        uploadPhoto: jest.fn(),
        removePhoto: jest.fn(),
    },
}));
jest.mock('../../../features/healthPhoto', () => ({ pickHealthPhoto: jest.fn() }));
jest.mock('../../../api/photos', () => ({
    photosApi: { quotaForPond: jest.fn(), usage: jest.fn() },
}));

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { HealthPhotoPicker } from '../HealthPhotoPicker';
import { healthObservationsApi } from '../../../api/healthObservations';
import { pickHealthPhoto } from '../../../features/healthPhoto';
import { useSyncStore } from '../../../store/syncStore';
import { photosApi } from '../../../api/photos';

const LIMITS = { photos: 1000, bytes: 1.5 * 1024 ** 3 };
const pool = (photos: number) => ({ data: { photos, bytes: 0, limits: LIMITS } });

/** Press the Alert button labelled `label` on the next Alert.alert. */
const pressAlertButton = (label: string) =>
    jest.spyOn(Alert, 'alert').mockImplementationOnce((_t, _m, buttons) => {
        (buttons as any[])?.find((b) => b.text === label)?.onPress?.();
    });

describe('HealthPhotoPicker — remove (P2)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useSyncStore.setState({ isConnected: true } as any);
        (healthObservationsApi.removePhoto as jest.Mock).mockResolvedValue({ data: { removed: true } });
        (photosApi.quotaForPond as jest.Mock).mockResolvedValue(pool(0));
    });

    it('adding one picks, uploads, and the picker offers a ✕ for it', async () => {
        (pickHealthPhoto as jest.Mock).mockResolvedValue('file:///local.jpg');
        (healthObservationsApi.uploadPhoto as jest.Mock).mockResolvedValue({ data: { path: 'farm1/new.webp' } });
        const onChange = jest.fn();
        pressAlertButton('Take a photo');
        const { getByTestId, getByLabelText } = render(<HealthPhotoPicker pondId="pond1" value={[]} onChange={onChange} />);

        await act(async () => fireEvent.press(getByTestId('health-photo-btn')));
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(['farm1/new.webp']));
        expect(getByLabelText('Remove photo')).toBeTruthy();
    });

    it('removing a NOT-yet-saved (this-session) photo drops it locally AND deletes the uploaded object', async () => {
        (pickHealthPhoto as jest.Mock).mockResolvedValue('file:///local.jpg');
        (healthObservationsApi.uploadPhoto as jest.Mock).mockResolvedValue({ data: { path: 'farm1/new.webp' } });
        const onChange = jest.fn();
        pressAlertButton('Take a photo');
        const { getByTestId, getByLabelText, rerender } = render(
            <HealthPhotoPicker pondId="pond1" value={[]} onChange={onChange} />,
        );
        await act(async () => fireEvent.press(getByTestId('health-photo-btn')));
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(['farm1/new.webp']));

        // Re-render as the parent would after onChange updates its own state.
        rerender(<HealthPhotoPicker pondId="pond1" value={['farm1/new.webp']} onChange={onChange} />);
        await act(async () => fireEvent.press(getByLabelText('Remove photo')));

        expect(onChange).toHaveBeenLastCalledWith([]);
        await waitFor(() => expect(healthObservationsApi.removePhoto).toHaveBeenCalledWith('pond1', 'farm1/new.webp'));
    });

    it('removing an ALREADY-SAVED photo drops the path but never calls the delete endpoint (the record\'s own save cleans it up)', async () => {
        const onChange = jest.fn();
        const { getByLabelText } = render(
            <HealthPhotoPicker
                pondId="pond1"
                value={['farm1/existing.webp']}
                onChange={onChange}
                existingUrls={['https://signed/existing']}
                existingThumbs={['https://signed/existing.thumb']}
            />,
        );
        await act(async () => fireEvent.press(getByLabelText('Remove photo')));
        expect(onChange).toHaveBeenCalledWith([]);
        expect(healthObservationsApi.removePhoto).not.toHaveBeenCalled();
    });

    it('a failed delete of a not-yet-saved photo still leaves it dropped from the draft (never blocks the UI)', async () => {
        (pickHealthPhoto as jest.Mock).mockResolvedValue('file:///local.jpg');
        (healthObservationsApi.uploadPhoto as jest.Mock).mockResolvedValue({ data: { path: 'farm1/new.webp' } });
        (healthObservationsApi.removePhoto as jest.Mock).mockRejectedValue(new Error('R2 down'));
        const onChange = jest.fn();
        pressAlertButton('Take a photo');
        jest.spyOn(Alert, 'alert');
        const { getByTestId, getByLabelText, rerender } = render(
            <HealthPhotoPicker pondId="pond1" value={[]} onChange={onChange} />,
        );
        await act(async () => fireEvent.press(getByTestId('health-photo-btn')));
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(['farm1/new.webp']));
        rerender(<HealthPhotoPicker pondId="pond1" value={['farm1/new.webp']} onChange={onChange} />);

        await act(async () => fireEvent.press(getByLabelText('Remove photo')));
        expect(onChange).toHaveBeenLastCalledWith([]);
    });
});

describe('HealthPhotoPicker — account photo pool (F2)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useSyncStore.setState({ isConnected: true } as any);
    });

    it('shows nothing below 80%, a quiet line from 80%', async () => {
        (photosApi.quotaForPond as jest.Mock).mockResolvedValue(pool(850));
        const { findByText } = render(<HealthPhotoPicker pondId="pond1" value={[]} onChange={jest.fn()} />);
        expect(await findByText('Photo storage is 85% full.')).toBeTruthy();
        expect(photosApi.quotaForPond).toHaveBeenCalledWith('pond1');
    });

    it('at 100% the add button is off and says Storage full', async () => {
        (photosApi.quotaForPond as jest.Mock).mockResolvedValue(pool(1000));
        const { findByText, getByTestId } = render(<HealthPhotoPicker pondId="pond1" value={[]} onChange={jest.fn()} />);
        expect(await findByText('Storage full — free up space')).toBeTruthy();
        expect(getByTestId('health-photo-btn').props.accessibilityState).toMatchObject({ disabled: true });
    });

    it('a server STORAGE_FULL refusal explains it instead of a generic error, and adds nothing', async () => {
        (photosApi.quotaForPond as jest.Mock).mockResolvedValue(pool(10));
        (pickHealthPhoto as jest.Mock).mockResolvedValue('file:///local.jpg');
        (healthObservationsApi.uploadPhoto as jest.Mock).mockRejectedValue({ response: { status: 403, data: { code: 'STORAGE_FULL' } } });
        const onChange = jest.fn();
        pressAlertButton('Take a photo');
        const alert = jest.spyOn(Alert, 'alert');
        const { getByTestId } = render(<HealthPhotoPicker pondId="pond1" value={[]} onChange={onChange} />);
        await act(async () => fireEvent.press(getByTestId('health-photo-btn')));
        await waitFor(() =>
            expect(alert).toHaveBeenLastCalledWith('Storage full — free up space', 'Storage full — free up space to add photos.', expect.any(Array)),
        );
        expect(onChange).not.toHaveBeenCalled();
    });
});
