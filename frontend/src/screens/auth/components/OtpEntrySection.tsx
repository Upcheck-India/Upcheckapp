import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    type EmitterSubscription,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { theme } from '../../../theme';
import {
    TruecallerAuth,
    TruecallerEvents,
    type TruecallerAuthResult,
    type TruecallerEventListener,
    type TruecallerVerificationEvent,
} from '../../../native/TruecallerAuth';

/**
 * `OtpEntrySection` — collects the OTP, displays a TTL countdown, supports
 * auto-fill from `OTP_RECEIVED` events, and gates the Verify and Resend
 * controls on the countdown.
 *
 * Validates Requirements 8.3 (Resend disabled while ttl > 0), 8.4 (auto-fill
 * on OTP_RECEIVED), 8.7 (verifyOtp on length ≥ 4), and 8.8 ("Invalid OTP" on
 * length < 4).
 */

const OTP_MIN_LENGTH = 4;
const OTP_MAX_LENGTH = 6;

export interface OtpEntrySectionProps {
    /** First name carried over from PhoneEntrySection — passed to verifyOtp. */
    firstName: string;
    /** Last name carried over from PhoneEntrySection — passed to verifyOtp. */
    lastName: string;
    /**
     * Initial TTL in seconds, sourced from the `OTP_INITIATED` event's `ttl`
     * field. The component drives a 1-second countdown from this value down
     * to zero. Pass a new value (or use `key`) to reset the countdown after
     * a successful resend.
     */
    ttl: number;
    /**
     * Optional resend handler. Invoked when the user taps "Resend OTP" while
     * the countdown is at zero. Parent typically re-runs
     * `TruecallerAuth.startManualVerification(...)` and supplies a fresh
     * `ttl` from the next `OTP_INITIATED` event.
     */
    onResend?: () => void;
    /** Notified when `verifyOtp` resolves; parent decides what to do next. */
    onVerifyResult?: (result: TruecallerAuthResult) => void;
    /**
     * Override the event subscription source. Defaults to
     * `TruecallerEvents.onEvent` so the section is self-contained, but tests
     * (and the parent screen, if it prefers a single subscription) can pass a
     * custom subscriber.
     */
    subscribeToEvents?: (listener: TruecallerEventListener) => EmitterSubscription;
    /**
     * Override `TruecallerAuth.verifyOtp` for testing. Defaults to the real
     * native bridge call.
     */
    verifyOtp?: (
        otp: string,
        firstName: string,
        lastName: string,
    ) => Promise<TruecallerAuthResult>;
}

const onlyDigits = (value: string): string => value.replace(/\D/g, '');

/** Format a non-negative integer of seconds as `m:ss` (e.g. 65 → `1:05`). */
const formatTtl = (seconds: number): string => {
    const safe = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const OtpEntrySection: React.FC<OtpEntrySectionProps> = ({
    firstName,
    lastName,
    ttl,
    onResend,
    onVerifyResult,
    subscribeToEvents,
    verifyOtp,
}) => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Local countdown driven from the `ttl` prop. Re-initializes whenever the
    // parent supplies a new TTL (e.g. after a successful resend).
    const initialTtl = Math.max(0, Math.floor(ttl));
    const [remaining, setRemaining] = useState<number>(initialTtl);

    useEffect(() => {
        setRemaining(Math.max(0, Math.floor(ttl)));
    }, [ttl]);

    useEffect(() => {
        if (remaining <= 0) return;
        const id = setInterval(() => {
            setRemaining((current) => (current > 0 ? current - 1 : 0));
        }, 1000);
        return () => clearInterval(id);
    }, [remaining]);

    // Subscribe to TruecallerEvents to auto-fill on OTP_RECEIVED
    // (Requirement 8.4). Defaults to the real emitter; tests can inject one.
    const subscriber = subscribeToEvents ?? TruecallerEvents.onEvent;
    const subscriberRef = useRef(subscriber);
    subscriberRef.current = subscriber;

    useEffect(() => {
        const handle: TruecallerEventListener = (event: TruecallerVerificationEvent) => {
            if (event.event === 'OTP_RECEIVED') {
                const incoming = (event.otp ?? '').toString();
                const digits = onlyDigits(incoming);
                if (digits.length > 0) {
                    setOtp(digits.slice(0, OTP_MAX_LENGTH));
                    setError(null);
                }
            }
        };
        const subscription = subscriberRef.current(handle);
        return () => subscription.remove();
    }, []);

    const handleChangeOtp = useCallback((value: string) => {
        const digits = onlyDigits(value).slice(0, OTP_MAX_LENGTH);
        setOtp(digits);
        if (error) setError(null);
    }, [error]);

    const verify = verifyOtp ?? TruecallerAuth.verifyOtp;

    const handleVerify = useCallback(async () => {
        // Requirement 8.8 — block submission and display "Invalid OTP" when
        // the entered value is shorter than 4 digits.
        if (otp.length < OTP_MIN_LENGTH) {
            setError('Invalid OTP');
            return;
        }
        setError(null);
        setIsVerifying(true);
        try {
            // Requirement 8.7 — submit through the JS wrapper.
            const result = await verify(otp, firstName, lastName);
            onVerifyResult?.(result);
        } catch (err: unknown) {
            const message =
                err instanceof Error && err.message ? err.message : 'Verification failed';
            setError(message);
        } finally {
            setIsVerifying(false);
        }
    }, [otp, firstName, lastName, verify, onVerifyResult]);

    const handleResend = useCallback(() => {
        if (remaining > 0) return; // Requirement 8.3 — disabled while ttl > 0.
        onResend?.();
        setOtp('');
        setError(null);
    }, [remaining, onResend]);

    const canResend = remaining <= 0;
    const ttlLabel = useMemo(() => formatTtl(remaining), [remaining]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialCommunityIcons
                    name="message-text-lock-outline"
                    size={40}
                    color={theme.roles.light.primary}
                />
                <Text style={styles.title}>Enter the OTP</Text>
                <Text style={styles.subtitle}>
                    We sent a verification code to your phone. Enter it below to continue.
                </Text>
            </View>

            <View style={styles.ttlRow}>
                <MaterialCommunityIcons
                    name="timer-outline"
                    size={18}
                    color={
                        canResend
                            ? theme.roles.light.textDisabled
                            : theme.roles.light.textSecondary
                    }
                />
                <Text
                    style={[
                        styles.ttlText,
                        canResend && styles.ttlTextExpired,
                    ]}
                    accessibilityLabel={`OTP expires in ${ttlLabel}`}
                >
                    {canResend ? 'OTP expired' : `Expires in ${ttlLabel}`}
                </Text>
            </View>

            <Input
                label="OTP"
                value={otp}
                onChangeText={handleChangeOtp}
                error={error ?? undefined}
                placeholder="Enter the code"
                keyboardType="number-pad"
                maxLength={OTP_MAX_LENGTH}
                leftIcon="lock-outline"
                autoFocus
                required
                // RN's autoComplete supports "sms-otp" / "one-time-code" on Android
                // for system-level auto-fill suggestions.
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
            />

            <Button
                title="Verify"
                onPress={handleVerify}
                loading={isVerifying}
                disabled={isVerifying}
                style={styles.verifyButton}
            />

            <TouchableOpacity
                onPress={handleResend}
                disabled={!canResend}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canResend }}
                style={styles.resendRow}
            >
                <Text
                    style={[
                        styles.resendText,
                        !canResend && styles.resendTextDisabled,
                    ]}
                >
                    {canResend ? 'Resend OTP' : `Resend OTP in ${ttlLabel}`}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: theme.spacing[3],
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing[4],
    },
    title: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[2],
    },
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
    },
    ttlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing[2],
        marginBottom: theme.spacing[2],
    },
    ttlText: {
        ...theme.typeScale.numericMedium,
        color: theme.roles.light.textSecondary,
    },
    ttlTextExpired: {
        color: theme.roles.light.textDisabled,
    },
    verifyButton: {
        marginTop: theme.spacing[2],
    },
    resendRow: {
        alignSelf: 'center',
        paddingVertical: theme.spacing[3],
    },
    resendText: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.primary,
    },
    resendTextDisabled: {
        color: theme.roles.light.textDisabled,
    },
});

export default OtpEntrySection;
