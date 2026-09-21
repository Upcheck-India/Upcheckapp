import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PhotoViewerModal } from '../PhotoViewerModal';
import { photosApi } from '../../../api/photos';
import { feedbackApi } from '../../../api/feedback';

jest.mock('../../../api/photos', () => ({
    ...jest.requireActual('../../../api/photos'),
    photosApi: { info: jest.fn(), backup: jest.fn() },
}));
jest.mock('../../../api/feedback', () => ({ feedbackApi: { reportPhoto: jest.fn() } }));
jest.mock('../../../features/photoBackup', () => ({
    sharePhoto: jest.fn(),
    planBackup: jest.fn(),
    shareBackupZip: jest.fn(),
    backupFilename: jest.fn(),
}));

const FARM = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PATH = `${FARM}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp`;
const URL = `https://upcheck-photos.acct.r2.cloudflarestorage.com/health/${PATH.replace('.webp', '.thumb.webp')}?X-Amz-Signature=s`;

const info = (over: object) => ({
    data: [{ path: PATH, entity: 'disease', recordId: 'rec-1', uploadedAt: '2025-09-01T00:00:00Z', uploadedByMe: false, fullDroppedAt: null, ...over }],
});

describe('PhotoViewerModal', () => {
    beforeEach(() => jest.clearAllMocks());

    it('F3: a downgraded photo shows its small copy with the caption — never a broken image', async () => {
        (photosApi.info as jest.Mock).mockResolvedValue(info({ fullDroppedAt: '2026-09-02T00:00:00Z' }));
        const { findByTestId, getByTestId } = render(<PhotoViewerModal photos={[URL]} initialIndex={0} onClose={jest.fn()} />);
        expect((await findByTestId('photo-viewer-small-copy')).props.children).toMatch(/^Small copy — full size kept until /);
        expect(photosApi.info).toHaveBeenCalledWith([PATH]);
        expect(getByTestId('photo-viewer-image')).toBeTruthy();
    });

    it('F7.8: "Report" on a photo someone else added files the path with the feedback pipeline', async () => {
        (photosApi.info as jest.Mock).mockResolvedValue(info({}));
        (feedbackApi.reportPhoto as jest.Mock).mockResolvedValue({ data: {} });
        const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _b, buttons) => buttons?.[1]?.onPress?.());
        const { findByLabelText, findByText } = render(<PhotoViewerModal photos={[URL]} initialIndex={0} onClose={jest.fn()} />);
        fireEvent.press(await findByLabelText('Report'));
        expect(alert).toHaveBeenCalled();
        await waitFor(() => expect(feedbackApi.reportPhoto).toHaveBeenCalledWith(PATH));
        expect(await findByText('Reported. Thank you — our team will look at it.')).toBeTruthy();
        alert.mockRestore();
    });

    it('no Report on your own photo, and no caption at full size', async () => {
        (photosApi.info as jest.Mock).mockResolvedValue(info({ uploadedByMe: true }));
        const { queryByLabelText, queryByTestId, findByLabelText } = render(
            <PhotoViewerModal photos={[URL]} initialIndex={0} onClose={jest.fn()} />,
        );
        await findByLabelText('Share');
        await waitFor(() => expect(photosApi.info).toHaveBeenCalled());
        expect(queryByLabelText('Report')).toBeNull();
        expect(queryByTestId('photo-viewer-small-copy')).toBeNull();
    });
});
