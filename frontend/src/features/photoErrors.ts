/**
 * P13: the backend returns a stable `code` for photo failures
 * (IMAGE_TOO_LARGE | UNSUPPORTED_TYPE | STORAGE_UNCONFIGURED |
 * AVATAR_NOT_MIGRATED — r2-storage.service.ts `PhotoErrorCode`). This maps
 * that code to localised copy under `health.photoError.*`; an unrecognised
 * or missing code falls back to the caller's own fallback string.
 */
import type { TFunction } from 'i18next';

export function photoErrorMessage(err: unknown, t: TFunction, fallback: string): string {
    const code = (err as any)?.response?.data?.code;
    if (typeof code === 'string') {
        const key = `health.photoError.${code}`;
        const translated = t(key);
        if (translated !== key) return translated;
    }
    return fallback;
}
