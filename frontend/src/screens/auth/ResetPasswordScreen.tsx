import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { authApi } from '../../api/auth';
import { passwordPolicyError } from '../../features/passwordPolicy';

const c = theme.roles.light;

/**
 * Landing for the password-reset email link (deep-linked as upcheckapp://reset-password).
 * Supabase puts a recovery access/refresh token in the URL fragment; we set the
 * session from it, then let the user choose a new password. If the link is
 * missing/expired, we point them at the reliable one-time-code sign-in.
 */
export const ResetPasswordScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [sessionReady, setSessionReady] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);

    // Supabase puts the recovery tokens in the URL fragment (#access_token=...).
    const establishFromUrl = (url: string | null) => {
        if (!url) return;
        const fragment = url.split('#')[1] ?? '';
        const grab = (key: string) => {
            const m = fragment.match(new RegExp(`(?:^|&)${key}=([^&]+)`));
            return m ? decodeURIComponent(m[1]) : null;
        };
        const access_token = grab('access_token');
        const refresh_token = grab('refresh_token');
        if (access_token && refresh_token) {
            supabase.auth
                .setSession({ access_token, refresh_token })
                .then(({ error }) => setSessionReady(!error))
                .catch(() => setSessionReady(false));
        }
    };

    useEffect(() => {
        Linking.getInitialURL().then(establishFromUrl);
        const sub = Linking.addEventListener('url', ({ url }) => establishFromUrl(url));
        return () => sub.remove();
    }, []);

    const submit = async () => {
        // Enforce the SAME policy as signup (upper+lower+digit+special, ≥8) so a
        // password set via reset can't be one the Register form would reject.
        const pwErr = passwordPolicyError(password);
        if (pwErr) {
            Alert.alert(t('common.error'), t(pwErr.key, pwErr.fallback));
            return;
        }
        if (password !== confirm) {
            Alert.alert(t('common.error'), t('auth.passwordMismatch', 'Passwords do not match'));
            return;
        }
        setBusy(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            // AUTH-2: the recovery session must not walk straight into the app.
            // Ask the backend whether 2FA gates this account; if so, hand the
            // recovery tokens over for a TOTP/backup challenge and drop the
            // local recovery session so it is never treated as authenticated.
            const { data: sess } = await supabase.auth.getSession();
            const access = sess.session?.access_token;
            const refresh = sess.session?.refresh_token;
            if (access && refresh) {
                try {
                    const { data } = await authApi.reset2faCheck(access, refresh);
                    if (data.requires2FA && data.tempToken) {
                        // Local scope only — clears the client session WITHOUT
                        // revoking the tokens server-side, so the challenge path
                        // can still redeem the stashed recovery session.
                        await supabase.auth.signOut({ scope: 'local' });
                        navigation.navigate('TwoFactorChallenge', { tempToken: data.tempToken });
                        return;
                    }
                } catch {
                    // If the 2FA check itself fails we fall through to the normal
                    // "signed out, go log in" path rather than stranding the user.
                }
            }

            Alert.alert(
                t('auth.resetDoneTitle', 'Password updated'),
                t('auth.resetDoneSub', 'You can now sign in with your new password.'),
            );
            navigation.navigate('Login');
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('auth.resetError', 'Could not reset password. Request a new link or sign in with a one-time code.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScreenWrapper>
            <Text style={styles.title}>{t('auth.resetTitle', 'Set a new password')}</Text>
            <Card style={styles.card}>
                {!sessionReady ? (
                    <Text style={styles.hint}>
                        {t('auth.resetWaiting', 'Open this screen from the reset link in your email. If the link expired, sign in with a one-time code instead.')}
                    </Text>
                ) : null}
                <Input
                    label={t('auth.newPassword', 'New password')}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="••••••••"
                />
                <Input
                    label={t('auth.confirmPassword', 'Confirm password')}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    placeholder="••••••••"
                />
                <Button title={t('auth.resetCta', 'Update password')} onPress={submit} loading={busy} disabled={!sessionReady} style={styles.btn} />
                <TouchableOpacity onPress={() => navigation.navigate('OtpLogin')} style={styles.fallback}>
                    <Text style={styles.fallbackText}>{t('auth.useOtpInstead', 'Sign in with a one-time code instead')}</Text>
                </TouchableOpacity>
            </Card>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    title: { ...theme.typeScale.h1, color: c.textPrimary, marginVertical: theme.spacing[4] },
    card: { padding: theme.spacing[4], gap: theme.spacing[2] },
    hint: { ...theme.typeScale.bodySmall, color: c.textSecondary, marginBottom: theme.spacing[2] },
    btn: { marginTop: theme.spacing[4] },
    fallback: { marginTop: theme.spacing[4], alignItems: 'center' },
    fallbackText: { ...theme.typeScale.labelMedium, color: c.primary },
});

export default ResetPasswordScreen;
