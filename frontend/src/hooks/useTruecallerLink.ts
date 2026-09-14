import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { apiErrorMessage } from '../api/errors';
import { TruecallerAuth } from '../native/TruecallerAuth';
import { useUIStore } from '../store/uiStore';

/**
 * Safe cross-provider linking: an already-signed-in user attaches their phone
 * via Truecaller one-tap. The backend links only by the VERIFIED phone; a
 * number already on another account returns 409.
 *
 * Moved out of ProfileScreen unchanged so the Account screen can offer it
 * without a second copy of the native flow.
 */
export function useTruecallerLink(onLinked: (phoneNumber: string) => void) {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const [isLinking, setIsLinking] = useState(false);
    const isAvailable = Platform.OS === 'android' && TruecallerAuth.isSupported();

    const linkPhone = useCallback(async () => {
        setIsLinking(true);
        try {
            const outcome = await TruecallerAuth.getAuthorizationCode();
            if (outcome.type !== 'oauth') {
                if (outcome.type === 'cancelled') return;
                showToast({
                    message: t(
                        'settings.linkTruecallerUnavailable',
                        'Truecaller isn\'t available. Open the Truecaller app, sign in, then try again.',
                    ),
                    type: 'error',
                });
                return;
            }
            const { data } = await authApi.truecallerLinkExchange({
                authorizationCode: outcome.authorizationCode,
                codeVerifier: outcome.codeVerifier,
                state: outcome.state,
            });
            onLinked(data.phoneNumber);
            showToast({
                message: t('settings.phoneLinked', 'Phone number linked'),
                type: 'success',
            });
        } catch (err: any) {
            const status = err?.response?.status;
            // '' so the `serverMsg || t(…)` fallback below still applies.
            const serverMsg = apiErrorMessage(err, '');
            if (status === 409) {
                showToast({
                    message:
                        serverMsg ||
                        t('settings.phoneAlreadyLinked', 'That number is already linked to another account.'),
                    type: 'error',
                });
            } else {
                showToast({
                    message: t('settings.linkTruecallerFailed', 'Could not link your number. Please try again.'),
                    type: 'error',
                });
            }
        } finally {
            setIsLinking(false);
        }
    }, [onLinked, showToast, t]);

    return { linkPhone, isLinking, isAvailable };
}
