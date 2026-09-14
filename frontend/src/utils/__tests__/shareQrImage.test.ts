const mockWrite = jest.fn();
const mockCreate = jest.fn();
const mockShareAsync = jest.fn(async () => undefined);
const mockCanShare = jest.fn(async () => true);
const mockTextShare = jest.fn(async () => ({ action: 'sharedAction' }));

jest.mock('expo-file-system', () => ({
    Paths: { cache: 'file:///cache/' },
    File: jest.fn().mockImplementation((_dir: string, name: string) => ({
        uri: `file:///cache/${name}`,
        exists: false,
        create: mockCreate,
        write: mockWrite,
        delete: jest.fn(),
    })),
}));
jest.mock('expo-sharing', () => ({
    __esModule: true,
    shareAsync: (...args: unknown[]) => mockShareAsync(...(args as [])),
    isAvailableAsync: () => mockCanShare(),
}));
jest.mock('react-native', () => ({
    Share: { share: (...args: unknown[]) => mockTextShare(...(args as [])) },
}));

import { shareQrImage, QR_EXPORT_PX } from '../shareQrImage';

const opts = { filename: 'qr.png', dialogTitle: 'Worker code', fallbackMessage: 'code: abc' };

const refReturning = (base64: string) => ({
    toDataURL: jest.fn((cb: (b: string) => void) => cb(base64)),
});

beforeEach(() => {
    jest.clearAllMocks();
    mockCanShare.mockResolvedValue(true);
});

it('writes the PNG as base64 and shares it as image/png', async () => {
    const ref = refReturning('iVBOR\nw0K');
    await expect(shareQrImage(ref, opts)).resolves.toBe('image');

    expect(ref.toDataURL).toHaveBeenCalledWith(expect.any(Function), { width: QR_EXPORT_PX, height: QR_EXPORT_PX });
    expect(mockWrite).toHaveBeenCalledWith('iVBORw0K', { encoding: 'base64' });
    expect(mockShareAsync).toHaveBeenCalledWith('file:///cache/qr.png', expect.objectContaining({ mimeType: 'image/png', dialogTitle: 'Worker code' }));
    expect(mockTextShare).not.toHaveBeenCalled();
});

it('falls back to text when sharing is unavailable', async () => {
    mockCanShare.mockResolvedValue(false);
    const ref = refReturning('iVBOR');
    await expect(shareQrImage(ref, opts)).resolves.toBe('text');
    expect(mockTextShare).toHaveBeenCalledWith({ message: 'code: abc' });
    expect(mockShareAsync).not.toHaveBeenCalled();
});

it('falls back to text when toDataURL throws', async () => {
    const ref = { toDataURL: jest.fn(() => { throw new Error('native boom'); }) };
    await expect(shareQrImage(ref, opts)).resolves.toBe('text');
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockTextShare).toHaveBeenCalledWith({ message: 'code: abc' });
});

it('falls back to text when the ref is missing or the image is empty', async () => {
    await expect(shareQrImage(null, opts)).resolves.toBe('text');
    await expect(shareQrImage(refReturning(''), opts)).resolves.toBe('text');
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(mockTextShare).toHaveBeenCalledTimes(2);
});
