import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/** Longest side after compression (spec D6: ≤1600 px, JPEG q0.7). */
export const HEALTH_PHOTO_MAX_PX = 1600;

/** Resize so the longer side is ≤ max; undefined when already small enough. */
export const resizeFor = (width: number, height: number, max = HEALTH_PHOTO_MAX_PX) => {
    if (!width || !height || Math.max(width, height) <= max) return undefined;
    return width >= height ? { width: max } : { height: max };
};

/**
 * Take (camera) or choose (gallery) one photo and compress it on the phone.
 * Resolves the local JPEG uri, or null when cancelled / permission refused.
 */
export async function pickHealthPhoto(from: 'camera' | 'library'): Promise<string | null> {
    const perm =
        from === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const result =
        from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets?.length) return null;
    const a = result.assets[0];
    const resize = resizeFor(a.width, a.height);
    const out = await manipulateAsync(a.uri, resize ? [{ resize }] : [], {
        compress: 0.7,
        format: SaveFormat.JPEG,
    });
    return out.uri;
}

/** Longest side of a profile picture before upload; the server re-encodes anyway. */
export const AVATAR_MAX_PX = 1024;

/**
 * Take or choose a profile picture, square-cropped in the system editor,
 * compressed on the phone. Resolves the local JPEG uri, or null when
 * cancelled / permission refused.
 */
export async function pickAvatarPhoto(from: 'camera' | 'library'): Promise<string | null> {
    const perm =
        from === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: true, aspect: [1, 1] };
    const result =
        from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets?.length) return null;
    const a = result.assets[0];
    const resize = resizeFor(a.width, a.height, AVATAR_MAX_PX);
    const out = await manipulateAsync(a.uri, resize ? [{ resize }] : [], {
        compress: 0.8,
        format: SaveFormat.JPEG,
    });
    return out.uri;
}
