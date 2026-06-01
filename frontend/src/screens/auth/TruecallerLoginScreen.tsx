/**
 * TruecallerLoginScreen — owns the Truecaller authentication FSM and routes
 * One-Tap (Flow A) and OTP / missed-call (Flow B) outcomes through the
 * backend verifier at `POST /auth/supabase/oauth/truecaller`.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.5, 8.6,
 *            12.2, 12.3, 12.4, 12.5.
 *
 * Phase state machine (per design.md):
 *   - `idle`                   → "Continue with Truecaller" button
 *   - `manual`                 → PhoneEntrySection (OTP / missed-call entry)
 *   - `awaiting_otp`           → OtpEntrySection with TTL countdown
 *   - `awaiting_missed_call`   → "Waiting for missed call" view with TTL
 *   - `verifying`              → spinner while POSTing to backend
 *
 * Trust boundary: nothing in this screen authorizes the user. The backend
 * verifier is the only component that decides whether the request is real
 * (per `TruecallerService.verifySignedPayload` / `verifyAccessToken`). The
 * screen forwards `payload`/`signature`/`requestNonce` (Flow A) or
 * `accessToken` (Flow B) and trusts the 200 / 401 response shape.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    type EmitterSubscription,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';
import { TruecallerLoginButton } from '../../components/ui/TruecallerLoginButton';
import { theme } from '../../theme';
import {
    TruecallerAuth,
    TruecallerEvents,
    type TruecallerAuthResult,
    type TruecallerErrorCode,
    type TruecallerVerificationEvent,
} from '../../native/TruecallerAuth';
import { requestTruecallerPermissions } from '../../native/truecallerPermissions';
import { PhoneEntrySection } from './components/PhoneEntrySection';
import { OtpEntrySection } from './components/OtpEntrySection';
import apiClient from '../../api/client';
import type { AuthResponse } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

// ──────────────────────────────────────────────────────────────────────────────
// FSM definition
// ──────────────────────────────────────────────────────────────────────────────

type Phase =
    | 'idle'
    | 'manual'
    | 'awaiting_otp'
    | 'awaiting_missed_call'
    | 'verifying';

const TRUECALLER_OAUTH_PATH = '/auth/supabase/oauth/truecaller';

/**
 * Default signature algorithm declared by the SDK for One-Tap and
 * `PROFILE_VERIFIED_BEFORE` payloads. The bridge surfaces the algorithm in
 * the One-Tap success result, but the `PROFILE_VERIFIED_BEFORE` event does
 * not carry it, so callers fall back to this constant per design.md §
 * "Flow B — Profile-verified-before".
 */
const DEFAULT_SIGNATURE_ALGORITHM = 'SHA512withRSA';

/**
 * The "Sign in with email" link's destination. Matches the auth route in
 * `RootNavigator` (`Login` is the email/password screen). Task 5.1 will wire
 * the inverse direction (LoginScreen → TruecallerLoginScreen) once the
 * Truecaller route is registered in the stack.
 */
const EMAIL_LOGIN_ROUTE = 'Login';

// ──────────────────────────────────────────────────────────────────────────────
// Backend payload shapes (mirror backend/src/auth/dto/truecaller-auth.dto.ts)
// ──────────────────────────────────────────────────────────────────────────────

interface SignedPayloadBody {
    payload: string;
    signature: string;
    signatureAlgorithm: string;
    requestNonce: string;
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
}

interface AccessTokenBody {
    accessToken: string;
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
}

type TruecallerOAuthBody = SignedPayloadBody | AccessTokenBody;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Parse a possibly-null SDK TTL string ("60") into a non-negative integer. */
function parseTtl(raw: string | null | undefined): number {
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Compose an E.164-shaped Indian phone number from a 10-digit local input.
 * The PhoneEntrySection sanitizes the user's entry to 10 digits, so this
 * helper only prepends `+91` when the value is exactly that shape; otherwise
 * (e.g. the SDK returned a fully-qualified number on PROFILE_VERIFIED_BEFORE
 * already) it returns the raw input unchanged.
 */
function toE164India(local: string): string {
    if (/^[6-9]\d{9}$/.test(local)) return `+91${local}`;
    return local;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export interface TruecallerLoginScreenProps {
    navigation: {
        navigate: (route: string, params?: object) => void;
        replace: (route: string, params?: object) => void;
        goBack: () => void;
    };
}

export const TruecallerLoginScreen: React.FC<TruecallerLoginScreenProps> = ({
    navigation,
}) => {
    const { t } = useTranslation();
    const setSession = useAuthStore((s) => s.setSession);

    const [phase, setPhase] = useState<Phase>('idle');
    const [ttl, setTtl] = useState<number>(0);
    /** Top-level error/info banner (permissions denied, network errors, ...). */
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    /**
     * Phone / first / last name captured from PhoneEntrySection. Held in a
     * ref alongside the `useState` mirror so the event subscription (which
     * is created once on mount and cannot reach into stale closures) always
     * reads the latest values when assembling the
     * `VERIFICATION_COMPLETE` POST body.
     */
    const [manualValues, setManualValues] = useState<{
        firstName: string;
        lastName: string;
        phoneNumber: string;
    }>({ firstName: '', lastName: '', phoneNumber: '' });
    const manualValuesRef = useRef(manualValues);
    manualValuesRef.current = manualValues;

    // ──────────────────────────────────────────────────────────────────
    // Backend dispatch
    // ──────────────────────────────────────────────────────────────────

    const sendToBackend = useCallback(
        async (body: TruecallerOAuthBody): Promise<void> => {
            setPhase('verifying');
            setStatusMessage(null);
            try {
                const { data } = await apiClient.post<AuthResponse>(
                    TRUECALLER_OAUTH_PATH,
                    body,
                );
                if (data.session) {
                    // Requirement 6.3 / 11.5: store the Supabase session in
                    // the existing auth store. RootNavigator swaps to the
                    // authenticated stack as soon as `isAuthenticated`
                    // flips to true, so explicit navigation is not required
                    // (and would race the stack reset).
                    setSession(data.session);
                    return;
                }
                // Backend returned 200 but no session — treat as a failure
                // and surface a generic message rather than silently strand
                // the user on the verifying spinner.
                Alert.alert(t('auth.loginFailed'), t('auth.noSessionByServer'));
                setPhase('idle');
            } catch (err: unknown) {
                const status =
                    (err as { response?: { status?: number } })?.response
                        ?.status;
                const message =
                    (err as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message ||
                    (err as { message?: string })?.message ||
                    t('auth.truecallerAuthFailed');

                if (status && status >= 400 && status < 500) {
                    // 401 from TruecallerService verification (signature
                    // mismatch, nonce replay, expired payload, etc.). Per
                    // design.md "Backend error response shape" rows, all
                    // such failures alert the user and return to idle.
                    Alert.alert(t('auth.loginFailed'), message);
                } else {
                    // Network / 5xx / unknown — show "Network error" per
                    // design.md "Backend unreachable" row.
                    Alert.alert(t('auth.networkError'), message);
                }
                setPhase('idle');
            }
        },
        [setSession, t],
    );

    // ──────────────────────────────────────────────────────────────────
    // Event subscription — runs once for the lifetime of the screen.
    // The handler reads the latest entry values via `manualValuesRef`
    // so renaming the user's inputs does not race the SDK callbacks.
    // ──────────────────────────────────────────────────────────────────

    useEffect(() => {
        const subscription: EmitterSubscription = TruecallerEvents.onEvent(
            (event: TruecallerVerificationEvent) => {
                switch (event.event) {
                    case 'OTP_INITIATED':
                        // Requirement 8.1 — show OtpEntrySection with TTL.
                        setTtl(parseTtl(event.ttl));
                        setPhase('awaiting_otp');
                        break;

                    case 'MISSED_CALL_INITIATED':
                        // Requirement 8.2 — show waiting view with TTL.
                        setTtl(parseTtl(event.ttl));
                        setPhase('awaiting_missed_call');
                        break;

                    case 'OTP_RECEIVED':
                        // OtpEntrySection subscribes to this event itself
                        // and auto-fills its input (Requirement 8.4); the
                        // screen has nothing further to do here.
                        break;

                    case 'MISSED_CALL_RECEIVED':
                        // The bridge auto-invokes `verifyMissedCall` on this
                        // event; the screen flips to a transient verifying
                        // state until VERIFICATION_COMPLETE arrives.
                        setPhase('verifying');
                        break;

                    case 'VERIFICATION_COMPLETE': {
                        // Requirement 8.5 — POST { accessToken, phone, names }.
                        const accessToken = event.accessToken;
                        if (!accessToken) {
                            Alert.alert(
                                t('auth.verificationFailed'),
                                t('auth.missingAccessToken'),
                            );
                            setPhase('manual');
                            return;
                        }
                        const { firstName, lastName, phoneNumber } =
                            manualValuesRef.current;
                        void sendToBackend({
                            accessToken,
                            phoneNumber: toE164India(phoneNumber),
                            firstName,
                            lastName,
                        });
                        break;
                    }

                    case 'PROFILE_VERIFIED_BEFORE': {
                        // Requirement 8.6 — POST signed payload from event.
                        const {
                            payload,
                            signature,
                            requestNonce,
                            phoneNumber,
                            firstName,
                            lastName,
                        } = event;
                        if (!payload || !signature || !requestNonce) {
                            Alert.alert(
                                t('auth.verificationFailed'),
                                t('auth.incompleteSignedPayload'),
                            );
                            setPhase('manual');
                            return;
                        }
                        const stored = manualValuesRef.current;
                        void sendToBackend({
                            payload,
                            signature,
                            // Bridge does not carry the algorithm on this
                            // event; SDK 2.6.0 signs PROFILE_VERIFIED_BEFORE
                            // payloads with SHA512withRSA by default.
                            signatureAlgorithm: DEFAULT_SIGNATURE_ALGORITHM,
                            requestNonce,
                            phoneNumber:
                                phoneNumber || toE164India(stored.phoneNumber),
                            firstName: firstName || stored.firstName,
                            lastName: lastName || stored.lastName,
                        });
                        break;
                    }

                    case 'VERIFICATION_FAILED':
                        // Requirement 12.4 — surface exceptionMessage and
                        // return to PhoneEntrySection so the user can retry.
                        Alert.alert(
                            t('auth.verificationFailed'),
                            event.exceptionMessage ||
                                t('auth.truecallerCannotVerify'),
                        );
                        setPhase('manual');
                        break;

                    default:
                        break;
                }
            },
        );

        return () => {
            subscription.remove();
        };
        // sendToBackend is stable (memoized on setSession/t) so omitting
        // it from the dep array would risk a stale-closure bug; including
        // it keeps the subscription consistent with the latest dispatcher.
    }, [sendToBackend, t]);

    // ──────────────────────────────────────────────────────────────────
    // Error routing for One-Tap failures (Requirements 6.4, 12.2, 12.3)
    // ──────────────────────────────────────────────────────────────────

    const routeOneTapError = useCallback(
        (error: TruecallerErrorCode | undefined): void => {
            switch (error) {
                // Requirement 6.4 — fall through to PhoneEntrySection.
                case 'ERROR_VERIFICATION_REQUIRED':
                case 'ERROR_TYPE_TC_NOT_INSTALLED':
                case 'ERROR_TYPE_USER_DENIED':
                // Requirement 12.3 — also fall through for these states.
                // eslint-disable-next-line no-fallthrough
                case 'ERROR_PROFILE_NOT_FOUND':
                case 'ERROR_TYPE_UNAUTHORIZED_USER':
                case 'ERROR_TYPE_TRUESDK_TOO_OLD':
                case 'ERROR_TYPE_INVALID_ACCOUNT_STATE':
                    setStatusMessage(null);
                    setPhase('manual');
                    return;

                // Requirement 12.2 — network failure stays on idle and
                // surfaces the exact message from the requirement text.
                case 'ERROR_TYPE_NETWORK':
                    setStatusMessage(t('auth.networkCheckMessage'));
                    setPhase('idle');
                    return;

                default:
                    Alert.alert(
                        t('auth.loginFailed'),
                        error ? `${t('auth.truecallerErrorPrefix')}${error}` : t('auth.unknownError'),
                    );
                    setPhase('idle');
            }
        },
        [t],
    );

    // ──────────────────────────────────────────────────────────────────
    // Entry point — One-Tap "Continue with Truecaller" button
    // ──────────────────────────────────────────────────────────────────

    const handleStartAuth = useCallback(async () => {
        setStatusMessage(null);

        // Requirement 3.4 — request runtime permissions before touching
        // the SDK. Requirement 3.5 — if any are denied, surface a message
        // and stay on the idle screen rather than calling authenticate().
        const permissionsResult = await requestTruecallerPermissions();
        if (!permissionsResult.granted) {
            const denied = permissionsResult.deniedPermissions
                .map((p) => p.split('.').pop())
                .join(', ');
            setStatusMessage(
                t('auth.permissionsRequired', {
                    suffix: denied ? ` (denied: ${denied})` : '',
                }),
            );
            return;
        }

        // Requirement 6.1 — invoke the bridge after permissions clear.
        const result: TruecallerAuthResult = await TruecallerAuth.authenticate();

        // Requirement 6.2 — One-Tap success: forward the signed payload to
        // the backend verifier. The DTO validator ensures phoneNumber is
        // present, so we coerce a missing value to an empty string only as
        // a defensive measure — the bridge always populates it on success.
        if ('flow' in result && result.flow === 'ONE_TAP' && result.successful) {
            await sendToBackend({
                payload: result.payload,
                signature: result.signature,
                signatureAlgorithm: result.signatureAlgorithm,
                requestNonce: result.requestNonce,
                phoneNumber: result.phoneNumber,
                firstName: result.firstName,
                lastName: result.lastName,
            });
            return;
        }

        // All other shapes carry an `error` field. Funnel them through the
        // routing table per Requirements 6.4, 12.2, 12.3.
        const errorCode =
            'error' in result
                ? (result.error as TruecallerErrorCode | undefined)
                : undefined;
        routeOneTapError(errorCode);
    }, [routeOneTapError, sendToBackend]);

    // ──────────────────────────────────────────────────────────────────
    // PhoneEntrySection submission — capture entered values and rely on
    // TruecallerEvents to drive the OTP / missed-call flow.
    // ──────────────────────────────────────────────────────────────────

    const handlePhoneSubmit = useCallback(
        (
            values: { firstName: string; lastName: string; phoneNumber: string },
            result: TruecallerAuthResult,
        ) => {
            // Stash the user-entered values so the screen can echo them in
            // the VERIFICATION_COMPLETE POST body (the backend ignores
            // request-body identity fields per Requirement 11.1, but the
            // DTO requires phoneNumber to be present and we want firstName
            // available as a backup display value).
            setManualValues(values);
            manualValuesRef.current = values;

            // Most failure modes for `startManualVerification` arrive via
            // the events channel (`VERIFICATION_FAILED`) rather than the
            // promise resolution. The promise itself only resolves with a
            // bridge-level error if the foreground activity is null or the
            // SDK is not initialized — handle those defensively.
            if ('successful' in result && result.successful === false) {
                if ('error' in result) {
                    routeOneTapError(result.error);
                }
                return;
            }
            // OTP_INITIATED / MISSED_CALL_INITIATED events will flip phase.
        },
        [routeOneTapError],
    );

    // ──────────────────────────────────────────────────────────────────
    // OtpEntrySection — handles its own verifyOtp call; we only act on
    // the result. Successful verification arrives via the events channel
    // (`VERIFICATION_COMPLETE`) and is dispatched in the events effect.
    // ──────────────────────────────────────────────────────────────────

    const handleOtpResult = useCallback(
        (result: TruecallerAuthResult) => {
            if ('event' in result && result.event === 'VERIFICATION_FAILED') {
                Alert.alert(
                    t('auth.verificationFailed'),
                    result.exceptionMessage || t('auth.invalidOtp'),
                );
                // Stay on awaiting_otp so the user can re-enter the OTP.
                return;
            }
            if ('successful' in result && result.successful === false) {
                if ('error' in result) {
                    routeOneTapError(result.error);
                }
            }
        },
        [routeOneTapError, t],
    );

    const handleOtpResend = useCallback(async () => {
        // Re-issue the verification request with the stored phone/name so
        // the SDK emits a fresh OTP_INITIATED event with a new TTL.
        const { firstName, lastName, phoneNumber } = manualValuesRef.current;
        if (!phoneNumber) return;
        try {
            await TruecallerAuth.startManualVerification(
                phoneNumber,
                firstName,
                lastName,
            );
        } catch {
            // Failures surface via the events channel; nothing to do here.
        }
    }, []);

    // ──────────────────────────────────────────────────────────────────
    // "Sign in with email" link — required from every phase
    // (Requirement 12.5 + Property 11).
    // ──────────────────────────────────────────────────────────────────

    const handleEmailLoginPress = useCallback(() => {
        navigation.navigate(EMAIL_LOGIN_ROUTE);
    }, [navigation]);

    const emailLoginLink = (
        <TouchableOpacity
            onPress={handleEmailLoginPress}
            accessibilityRole="link"
            accessibilityLabel={t('auth.signInWithEmail')}
            style={styles.emailLink}
            activeOpacity={0.7}
        >
            <MaterialCommunityIcons
                name="email-outline"
                size={18}
                color={theme.roles.light.primary}
            />
            <Text style={styles.emailLinkText}>{t('auth.signInWithEmail')}</Text>
        </TouchableOpacity>
    );

    // ──────────────────────────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────────────────────────

    return (
        <ScreenWrapper keyboardAvoiding>
            <View style={styles.header}>
                <MaterialCommunityIcons
                    name="phone-check"
                    size={48}
                    color={theme.roles.light.primary}
                />
                <Text style={styles.title}>{t('auth.truecallerTitle')}</Text>
                <Text style={styles.subtitle}>
                    {t('auth.truecallerSubtitle')}
                </Text>
            </View>

            {statusMessage && (
                <View style={styles.statusBanner}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={18}
                        color={theme.roles.light.dangerText}
                    />
                    <Text style={styles.statusBannerText}>{statusMessage}</Text>
                </View>
            )}

            {phase === 'idle' && (
                <View style={styles.section}>
                    <TruecallerLoginButton
                        onPress={handleStartAuth}
                        loading={false}
                    />
                    <Text style={styles.helperText}>
                        {t('auth.requestPhonePermissions')}
                    </Text>
                </View>
            )}

            {phase === 'manual' && (
                <View style={styles.section}>
                    <PhoneEntrySection
                        initialValues={manualValues}
                        onSubmit={handlePhoneSubmit}
                    />
                </View>
            )}

            {phase === 'awaiting_otp' && (
                <View style={styles.section}>
                    <OtpEntrySection
                        firstName={manualValues.firstName}
                        lastName={manualValues.lastName}
                        ttl={ttl}
                        onResend={handleOtpResend}
                        onVerifyResult={handleOtpResult}
                    />
                </View>
            )}

            {phase === 'awaiting_missed_call' && (
                <View style={styles.section}>
                    <View style={styles.waitingCard}>
                        <ActivityIndicator
                            size="large"
                            color={theme.roles.light.primary}
                        />
                        <Text style={styles.waitingTitle}>
                            {t('auth.waitingForMissedCall')}
                        </Text>
                        <Text style={styles.waitingBody}>
                            {t('auth.missedCallBody')}
                        </Text>
                        {ttl > 0 && (
                            <Text style={styles.waitingTtl}>
                                {t('auth.expiresIn', { seconds: ttl })}
                            </Text>
                        )}
                    </View>
                    <Button
                        title={t('common.cancel')}
                        variant="text"
                        onPress={() => setPhase('manual')}
                        style={styles.cancelButton}
                    />
                </View>
            )}

            {phase === 'verifying' && (
                <View style={[styles.section, styles.verifyingSection]}>
                    <ActivityIndicator
                        size="large"
                        color={theme.roles.light.primary}
                    />
                    <Text style={styles.verifyingText}>{t('auth.verifyingWithUpcheck')}</Text>
                </View>
            )}

            {/* Persistent "Sign in with email" link — Requirement 12.5 +
                Property 11 (visible from every phase). */}
            <View style={styles.footer}>{emailLoginLink}</View>
        </ScreenWrapper>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
        paddingTop: theme.spacing[6],
        paddingBottom: theme.spacing[6],
    },
    title: {
        ...theme.typeScale.h1,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[2],
        textAlign: 'center',
    },
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
    section: {
        paddingVertical: theme.spacing[2],
    },
    helperText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing[3],
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing[2],
        backgroundColor: theme.roles.light.dangerBg,
        borderLeftWidth: 3,
        borderLeftColor: theme.roles.light.dangerText,
        borderRadius: theme.radius.sm,
        padding: theme.spacing[4],
        marginBottom: theme.spacing[4],
    },
    statusBannerText: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.dangerText,
        flex: 1,
    },
    waitingCard: {
        alignItems: 'center',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[6],
    },
    waitingTitle: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
        textAlign: 'center',
    },
    waitingBody: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
    waitingTtl: {
        ...theme.typeScale.numericMedium,
        color: theme.roles.light.textSecondary,
    },
    cancelButton: {
        marginTop: theme.spacing[3],
    },
    verifyingSection: {
        alignItems: 'center',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[8],
    },
    verifyingText: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    footer: {
        marginTop: theme.spacing[6],
        alignItems: 'center',
    },
    emailLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[4],
    },
    emailLinkText: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.primary,
    },
});

export default TruecallerLoginScreen;
