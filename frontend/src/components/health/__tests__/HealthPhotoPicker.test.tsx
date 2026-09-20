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

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { HealthPhotoPicker } from '../HealthPhotoPicker';
import { healthObservationsApi } from '../../../api/healthObservations';
import { pickHealthPhoto } from '../../../features/healthPhoto';
import { useSyncStore } from '../../../store/syncStore';

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
