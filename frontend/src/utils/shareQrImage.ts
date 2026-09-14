/**
 * Share a rendered QR code as a PNG file, not as text.
 *
 * `ref` is what react-native-qrcode-svg hands to `getRef` — the underlying
 * react-native-svg <Svg>. Its `toDataURL(cb, { width, height })` redraws the
 * vector at the requested size on both Android and iOS (the viewBox scales),
 * so a 72dp on-screen QR still exports as a crisp 1024px image.
 *
 * Any failure (no share sheet, conversion error, native never answering)
 * falls back to the existing text share so the button always does something.
 */

import { Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const QR_EXPORT_PX = 1024;
const TO_DATA_URL_TIMEOUT_MS = 5000;

export interface ShareQrImageOptions {
    /** Bare filename in the cache dir, e.g. `neerani-worker-qr.png`. */
    filename: string;
    dialogTitle?: string;
    /** Text shared when the image cannot be. */
    fallbackMessage: string;
}

type SvgRef = { toDataURL?: (cb: (base64: string) => void, options?: object) => void } | null | undefined;

const toBase64 = (ref: SvgRef): Promise<string> =>
    new Promise((resolve, reject) => {
        if (!ref?.toDataURL) return reject(new Error('QR ref not ready'));
        // Android waits for the view's first draw before answering; never hang the button on it.
        const timer = setTimeout(() => reject(new Error('toDataURL timed out')), TO_DATA_URL_TIMEOUT_MS);
        try {
            ref.toDataURL(
                (base64) => {
                    clearTimeout(timer);
                    // iOS wraps base64 with line feeds; iOS also answers with nothing on failure.
                    const clean = (base64 ?? '').replace(/\s/g, '');
                    if (clean) resolve(clean);
                    else reject(new Error('empty QR image'));
                },
                { width: QR_EXPORT_PX, height: QR_EXPORT_PX },
            );
        } catch (e) {
            clearTimeout(timer);
            reject(e);
        }
    });

const shareText = async (message: string) => {
    try {
        await Share.share({ message });
    } catch {
        // Share sheet dismissed — nothing to report.
    }
};

/** Resolves `'image'` or `'text'` — whichever was actually shared. */
export const shareQrImage = async (ref: SvgRef, options: ShareQrImageOptions): Promise<'image' | 'text'> => {
    const { filename, dialogTitle, fallbackMessage } = options;
    let uri: string;
    try {
        if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
        const base64 = await toBase64(ref);
        const file = new File(Paths.cache, filename);
        if (file.exists) file.delete();
        file.create();
        file.write(base64, { encoding: 'base64' });
        uri = file.uri;
    } catch {
        await shareText(fallbackMessage);
        return 'text';
    }
    try {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
    } catch {
        // Dismissed or the target app refused — the image was offered; do not double-prompt with text.
    }
    return 'image';
};

export default shareQrImage;
