/**
 * Account — name, email, password and the sign-in methods on this account.
 *
 * Every credential change goes through the backend, which re-verifies (current
 * password, or a 6-digit code emailed to the address being proven). Nothing
 * here touches the session: after a change we only re-read the profile and
 * fold the new name/email into authStore.user via refreshUser.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { profilesApi, type ProfileCompat } from '../../api/profiles';
import { authApi } from '../../api/auth';
import { apiErrorMessage } from '../../api/errors';
import { passwordPolicyError } from '../../features/passwordPolicy';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { useTruecallerLink } from '../../hooks/useTruecallerLink';
import { formatDate } from '../../utils/formatDate';

const c = theme.roles.light;

/** Backend `code` → translated sentence; otherwise the server's message. */
export function accountErrorMessage(err: unknown, t: TFunction): string {
    const code = (err as any)?.response?.data?.code;
    if (typeof code === 'string') {
        const key = `settings.account.errors.${code}`;
        const msg = t(key);
        if (msg && msg !== key) return msg;
    }
    return apiErrorMessage(err, t('settings.account.errors.generic'));
}

/**
 * `/auth/*` requests are never auto-refreshed by the API client, so an
 * expired access token would just fail. A 401 retries once after a
 * `/profiles/me` read, which DOES go through the client's normal refresh.
 */
async function withFreshToken<T>(call: () => Promise<T>): Promise<T> {
    try {
        return await call();
    } catch (err: any) {
        if (err?.response?.status !== 401) throw err;
        await profilesApi.getMine();
        return call();
    }
}

export const AccountScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const refreshUser = useAuthStore((s) => s.refreshUser);
    const showToast = useUIStore((s) => s.showToast);
    const { pickGoogleIdToken, isReady: googleReady } = useGoogleAuth();

    const [profile, setProfile] = useState<ProfileCompat | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const [fullName, setFullName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [emailCode, setEmailCode] = useState('');
    const [emailCodeSent, setEmailCodeSent] = useState(false);
    const [emailPassword, setEmailPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordCode, setPasswordCode] = useState('');
    const [passwordCodeSent, setPasswordCodeSent] = useState(false);
    const [error, setError] = useState<{ section: string; message: string } | null>(null);

    const load = useCallback(async () => {
        try {
            const { data } = await profilesApi.getMine();
            setProfile(data);
            setFullName(data.fullName || '');
            refreshUser(data);
            return data;
        } catch (err) {
            setError({ section: 'load', message: accountErrorMessage(err, t) });
            return null;
        }
    }, [refreshUser, t]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const { linkPhone, isLinking, isAvailable: truecallerAvailable } = useTruecallerLink(
        useCallback(() => { load(); }, [load]),
    );

    const run = async (section: string, action: () => Promise<void>) => {
        setError(null);
        setBusy(section);
        try {
            await action();
        } catch (err) {
            setError({ section, message: accountErrorMessage(err, t) });
        } finally {
            setBusy(null);
        }
    };

    const policyMessage = (pw: string) => {
        const rule = passwordPolicyError(pw);
        if (rule) return t(rule.key, rule.fallback);
        if (pw !== confirmPassword) return t('settings.account.passwordMismatch');
        return null;
    };

    const isGoogle = !!profile?.providers?.includes('google');
    const hasPassword = !!profile?.hasPassword;
    const realEmail = profile && !profile.emailIsInternal ? profile.email || '' : '';

    // ── name ──
    const saveName = () =>
        run('name', async () => {
            const name = fullName.trim();
            if (!name) throw { response: { data: { message: t('auth.fullNameRequired') } } };
            const { data } = await profilesApi.updateMyName(name);
            setProfile(data);
            refreshUser(data);
            showToast({ message: t('settings.account.nameSaved'), type: 'success' });
        });

    // ── email ──
    const sendEmailCode = () =>
        run('email', async () => {
            await withFreshToken(() => authApi.account.requestEmailCode('change_email', newEmail.trim()));
            setEmailCodeSent(true);
        });

    const changeEmail = () =>
        run('email', async () => {
            await withFreshToken(() =>
                authApi.account.changeEmail(newEmail.trim(), emailCode.trim(), hasPassword ? emailPassword : undefined),
            );
            setEmailCodeSent(false);
            setNewEmail('');
            setEmailCode('');
            setEmailPassword('');
            await load();
            showToast({ message: t('settings.account.emailChanged'), type: 'success' });
        });

    // ── password ──
    const changePassword = () =>
        run('password', async () => {
            const invalid = policyMessage(newPassword);
            if (invalid) throw { response: { data: { message: invalid } } };
            try {
                await withFreshToken(() => authApi.updatePassword(currentPassword, newPassword));
            } catch (err: any) {
                // This endpoint answers a wrong current password with a 401.
                if (err?.response?.status === 401) {
                    throw { response: { data: { code: 'CURRENT_PASSWORD_INVALID' } } };
                }
                throw err;
            }
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            showToast({ message: t('settings.account.passwordChanged'), type: 'success' });
        });

    const sendPasswordCode = () =>
        run('password', async () => {
            await withFreshToken(() => authApi.account.requestEmailCode('set_password'));
            setPasswordCodeSent(true);
        });

    const setPassword = () =>
        run('password', async () => {
            const invalid = policyMessage(newPassword);
            if (invalid) throw { response: { data: { message: invalid } } };
            await withFreshToken(() => authApi.account.setPassword(passwordCode.trim(), newPassword));
            setPasswordCodeSent(false);
            setPasswordCode('');
            setNewPassword('');
            setConfirmPassword('');
            await load();
            showToast({ message: t('settings.account.passwordSet'), type: 'success' });
        });

    // ── Google ──
    const linkGoogle = () =>
        run('methods', async () => {
            const idToken = await pickGoogleIdToken();
            if (!idToken) return;
            await withFreshToken(() => authApi.account.linkGoogle(idToken));
            await load();
            showToast({ message: t('settings.account.googleLinked'), type: 'success' });
        });

    const errorFor = (section: string) =>
        error?.section === section ? <Text style={styles.error}>{error.message}</Text> : null;

    const MethodRow = ({ icon, label, detail, connected, action }: {
        icon: keyof typeof MaterialCommunityIcons.glyphMap;
        label: string;
        detail?: string | null;
        connected: boolean;
        action?: React.ReactNode;
    }) => (
        <View style={styles.methodRow}>
            <MaterialCommunityIcons name={icon} size={22} color={c.textSecondary} />
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.methodLabel}>{label}</Text>
                <Text style={styles.methodDetail} numberOfLines={1}>
                    {detail || (connected ? t('settings.account.connected') : t('settings.account.notConnected'))}
                </Text>
            </View>
            {connected ? (
                <MaterialCommunityIcons name="check-circle" size={20} color={c.successBorder} />
            ) : action}
        </View>
    );

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.back', 'Back')}
                    style={styles.backBtn}
                >
                    <MaterialCommunityIcons name="chevron-left" size={28} color={c.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('settings.account.title')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {errorFor('load')}

                {/* Name */}
                <Text style={styles.section}>{t('settings.account.nameSection')}</Text>
                <Card style={styles.card}>
                    <Input
                        label={t('auth.fullNameLabel')}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder={t('auth.fullNamePlaceholder')}
                        maxLength={80}
                    />
                    {errorFor('name')}
                    <Button
                        title={t('common.save')}
                        onPress={saveName}
                        loading={busy === 'name'}
                        disabled={!profile || !fullName.trim() || fullName.trim() === (profile.fullName || '')}
                    />
                </Card>

                {/* Email */}
                <Text style={styles.section}>{t('settings.account.emailSection')}</Text>
                <Card style={styles.card}>
                    <Text style={styles.value}>{realEmail || t('settings.account.emailNone')}</Text>
                    {isGoogle ? (
                        <Text style={styles.note}>{t('settings.account.emailGoogleLocked')}</Text>
                    ) : profile ? (
                        <>
                            <Input
                                label={realEmail ? t('settings.account.newEmailLabel') : t('settings.account.addEmailLabel')}
                                value={newEmail}
                                onChangeText={(v) => { setNewEmail(v); setEmailCodeSent(false); }}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                placeholder={t('auth.emailPlaceholder')}
                            />
                            {emailCodeSent && (
                                <>
                                    <Text style={styles.note}>
                                        {t('settings.account.codeSentTo', { email: newEmail.trim() })}
                                    </Text>
                                    <Input
                                        label={t('settings.account.codeLabel')}
                                        value={emailCode}
                                        onChangeText={setEmailCode}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                    />
                                    {hasPassword && (
                                        <Input
                                            label={t('settings.account.currentPasswordLabel')}
                                            value={emailPassword}
                                            onChangeText={setEmailPassword}
                                            isPassword
                                            autoCapitalize="none"
                                        />
                                    )}
                                </>
                            )}
                            {errorFor('email')}
                            {emailCodeSent ? (
                                <View style={styles.actions}>
                                    <Button
                                        title={t('settings.account.resendCode')}
                                        variant="outlined"
                                        onPress={sendEmailCode}
                                        disabled={busy === 'email'}
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        title={t('settings.account.changeEmailButton')}
                                        onPress={changeEmail}
                                        loading={busy === 'email'}
                                        disabled={emailCode.trim().length !== 6 || (hasPassword && !emailPassword)}
                                        style={{ flex: 1 }}
                                    />
                                </View>
                            ) : (
                                <Button
                                    title={t('settings.account.sendCode')}
                                    onPress={sendEmailCode}
                                    loading={busy === 'email'}
                                    disabled={!newEmail.includes('@')}
                                />
                            )}
                        </>
                    ) : null}
                </Card>

                {/* Password */}
                <Text style={styles.section}>{t('settings.account.passwordSection')}</Text>
                <Card style={styles.card}>
                    {!profile ? null : hasPassword ? (
                        <>
                            <Input
                                label={t('settings.account.currentPasswordLabel')}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                isPassword
                                autoCapitalize="none"
                            />
                            <Input
                                label={t('settings.account.newPasswordLabel')}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                isPassword
                                autoCapitalize="none"
                            />
                            <Input
                                label={t('settings.account.confirmPasswordLabel')}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                isPassword
                                autoCapitalize="none"
                            />
                            {errorFor('password')}
                            <Button
                                title={t('settings.account.changePasswordButton')}
                                onPress={changePassword}
                                loading={busy === 'password'}
                                disabled={!currentPassword || !newPassword || !confirmPassword}
                            />
                        </>
                    ) : !realEmail ? (
                        <Text style={styles.note}>{t('settings.account.needEmailFirst')}</Text>
                    ) : (
                        <>
                            <Text style={styles.note}>{t('settings.account.setPasswordIntro')}</Text>
                            {passwordCodeSent && (
                                <>
                                    <Text style={styles.note}>
                                        {t('settings.account.codeSentTo', { email: realEmail })}
                                    </Text>
                                    <Input
                                        label={t('settings.account.codeLabel')}
                                        value={passwordCode}
                                        onChangeText={setPasswordCode}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                    />
                                    <Input
                                        label={t('settings.account.newPasswordLabel')}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        isPassword
                                        autoCapitalize="none"
                                    />
                                    <Input
                                        label={t('settings.account.confirmPasswordLabel')}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        isPassword
                                        autoCapitalize="none"
                                    />
                                </>
                            )}
                            {errorFor('password')}
                            {passwordCodeSent ? (
                                <View style={styles.actions}>
                                    <Button
                                        title={t('settings.account.resendCode')}
                                        variant="outlined"
                                        onPress={sendPasswordCode}
                                        disabled={busy === 'password'}
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        title={t('settings.account.setPasswordButton')}
                                        onPress={setPassword}
                                        loading={busy === 'password'}
                                        disabled={passwordCode.trim().length !== 6 || !newPassword || !confirmPassword}
                                        style={{ flex: 1 }}
                                    />
                                </View>
                            ) : (
                                <Button
                                    title={t('settings.account.sendCode')}
                                    onPress={sendPasswordCode}
                                    loading={busy === 'password'}
                                />
                            )}
                        </>
                    )}
                </Card>

                {/* Sign-in methods */}
                <Text style={styles.section}>{t('settings.account.methodsSection')}</Text>
                <Card style={styles.card}>
                    <MethodRow
                        icon="email-outline"
                        label={t('settings.account.methodEmail')}
                        detail={hasPassword ? realEmail : null}
                        connected={hasPassword}
                    />
                    <MethodRow
                        icon="google"
                        label={t('settings.account.methodGoogle')}
                        connected={isGoogle}
                        action={
                            googleReady && profile ? (
                                <Button
                                    title={t('settings.account.linkGoogle')}
                                    variant="outlined"
                                    onPress={linkGoogle}
                                    loading={busy === 'methods'}
                                />
                            ) : null
                        }
                    />
                    <MethodRow
                        icon="phone-check"
                        label={t('settings.account.methodPhone')}
                        detail={profile?.phoneVerified && profile.phone ? `+${profile.phone}` : null}
                        connected={!!profile?.phoneVerified}
                        action={
                            truecallerAvailable && profile ? (
                                <Button
                                    title={t('settings.account.verifyPhone')}
                                    variant="outlined"
                                    onPress={linkPhone}
                                    loading={isLinking}
                                />
                            ) : null
                        }
                    />
                    {errorFor('methods')}
                </Card>

                <View style={styles.memberSince}>
                    <Text style={styles.note}>
                        {t('settings.memberSince')}:{' '}
                        {profile?.createdAt ? formatDate(profile.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </Text>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
        paddingTop: theme.spacing[2],
        paddingBottom: theme.spacing[4],
    },
    backBtn: { padding: theme.spacing[1] },
    headerTitle: { ...theme.typeScale.h3, color: c.textPrimary },
    section: {
        ...theme.typeScale.labelLarge,
        color: c.textPrimary,
        fontWeight: '600',
        marginBottom: theme.spacing[2],
    },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[5], gap: theme.spacing[2] },
    value: { ...theme.typeScale.bodyLarge, color: c.textPrimary, fontWeight: '500' },
    note: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    error: { ...theme.typeScale.bodySmall, color: c.dangerText },
    actions: { flexDirection: 'row', gap: theme.spacing[3] },
    methodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        minHeight: 48,
    },
    methodLabel: { ...theme.typeScale.labelLarge, color: c.textPrimary },
    methodDetail: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    memberSince: { alignItems: 'center', paddingBottom: theme.spacing[8] },
});
