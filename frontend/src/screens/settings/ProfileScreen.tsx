import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { WORKER_QR_PREFIX } from '../../api/farmMembers';
import { shareQrImage } from '../../utils/shareQrImage';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton, SkeletonAvatar } from '../../components/ui/Skeleton';
import { ErrorState, NetworkError } from '../../components/ui/ErrorState';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { profilesApi, ProfileCompat, type MyAvatar } from '../../api/profiles';
import { Avatar } from '../../components/ui/Avatar';
import { ProfilePhotoSection } from '../../components/profile/ProfilePhotoSection';

export const ProfileScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const showToast = useUIStore((s) => s.showToast);

    // The worker code was QR-only in practice — no way to get it onto the
    // clipboard or into a chat/SMS message for a remote owner, only usable
    // if the two people are physically together with a camera.
    const handleCopyWorkerCode = useCallback(async () => {
        if (!user?.id) return;
        await Clipboard.setStringAsync(user.id);
        showToast({ message: t('members.workerCodeCopied', 'Code copied'), type: 'success' });
    }, [user?.id, showToast, t]);

    const handleShareWorkerCode = useCallback(async () => {
        if (!user?.id) return;
        try {
            await Share.share({
                message: t('members.workerCodeShareMessage', 'My Neerani worker code: {{code}}', { code: user.id }),
            });
        } catch {
            // User cancelled the share sheet — not an error.
        }
    }, [user?.id, t]);

    const workerQrRef = useRef<any>(null);
    const handleShareWorkerQrImage = useCallback(() => {
        if (!user?.id) return;
        shareQrImage(workerQrRef.current, {
            filename: 'neerani-worker-qr.png',
            dialogTitle: t('members.qr.workerDialogTitle', { name: user.name ?? '' }),
            fallbackMessage: t('members.workerCodeShareMessage', { code: user.id }),
        });
    }, [user?.id, user?.name, t]);

    // Deleting an account wipes every farm/pond/record the user owns and is
    // irreversible — far too destructive for a single Alert tap. Route to the
    // dedicated strict-confirmation screen (typed confirmation + password
    // re-auth) instead of confirming inline here.
    const handleDeleteAccount = () => navigation.navigate('DeleteAccount');

    // Name, email, password, Google and Truecaller phone linking all live on
    // the Account screen now (useTruecallerLink holds the phone flow). The
    // old inline editor saved nothing: its DTO had no validators, so the
    // global whitelist stripped every field, and phone was never sent at all.
    const [profile, setProfile] = useState<ProfileCompat | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    const fadeIn = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    const fetchProfile = useCallback(async () => {
        setError(null);
        setIsOffline(false);

        try {
            const { data } = await profilesApi.getMine();
            setProfile(data);
            fadeIn();
        } catch (err: any) {
            const statusCode = err?.response?.status;
            if (statusCode === 0 || err?.code === 'NETWORK_ERROR' || !err?.response) {
                setIsOffline(true);
            }
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [fadeIn]);

    // React Navigation keeps this screen mounted, so a mount-only fetch never
    // re-ran on return — this is the direct write path CreateFarmScreen's
    // sibling, ProfileScreen's own `handleSave` (line ~180 below), used to
    // bypass entirely: the interceptor now invalidates nothing for /profiles
    // (see query/client.ts), so this screen must ask again itself on focus.
    useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        fetchProfile();
    }, [fetchProfile]);

    const renderSkeleton = () => (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.headerBackground}>
                <View style={styles.headerTop}>
                    <Skeleton width={100} height={24} />
                    <Skeleton width={24} height={24} borderRadius={12} />
                </View>
                <View style={styles.profileInfoContainer}>
                    <SkeletonAvatar size={80} />
                    <Skeleton width={150} height={28} style={styles.mb2} />
                    <Skeleton width={180} height={16} />
                </View>
            </View>
            <View style={styles.content}>
                <Card style={styles.infoCard}>
                    <Skeleton width="100%" height={40} style={styles.mb3} />
                    <Skeleton width="100%" height={40} style={styles.mb3} />
                    <Skeleton width="100%" height={40} style={styles.mb3} />
                    <Skeleton width="100%" height={40} />
                </Card>
            </View>
        </ScreenWrapper>
    );

    if (isLoading) {
        return renderSkeleton();
    }

    if (isOffline) {
        return (
            <ScreenWrapper scroll={false} padded={false}>
                <View style={styles.headerBackground}>
                    <View style={styles.headerTop}>
                        <Text style={styles.headerTitle}>{t('settings.profile')}</Text>
                    </View>
                </View>
                <NetworkError onRetry={handleRetry} />
            </ScreenWrapper>
        );
    }

    if (error && !profile) {
        return (
            <ScreenWrapper scroll={false} padded={false}>
                <View style={styles.headerBackground}>
                    <View style={styles.headerTop}>
                        <Text style={styles.headerTitle}>{t('settings.profile')}</Text>
                    </View>
                </View>
                <ErrorState
                    title={t('settings.profileLoadError')}
                    error={error}
                    onRetry={handleRetry}
                />
            </ScreenWrapper>
        );
    }

    const displayName = profile?.fullName || user?.name || 'User';
    const initials =
        displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
    const avatar: MyAvatar = {
        avatarUrl: profile?.avatarUrl ?? null,
        avatarThumbUrl: profile?.avatarThumbUrl ?? profile?.avatarUrl ?? null,
        hasUploadedAvatar: !!profile?.hasUploadedAvatar,
        showAvatarToTeam: profile?.showAvatarToTeam !== false,
    };
    const setAvatar = (next: MyAvatar) =>
        setProfile((p) => (p ? { ...p, ...next, avatarUrl: next.avatarUrl ?? undefined } : p));

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.headerBackground}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>{t('settings.profile')}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('MainApp', { screen: 'Settings' })}>
                        <MaterialCommunityIcons name="cog" size={24} color={theme.roles.light.surface} />
                    </TouchableOpacity>
                </View>

                <Animated.View style={[styles.profileInfoContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.avatarContainer}>
                        <Avatar uri={avatar.avatarThumbUrl} initials={initials} seed={user?.id ?? displayName} size={76} />
                    </View>
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'N/A'}</Text>
                </Animated.View>
            </View>

            <Animated.View style={{ opacity: fadeAnim }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                        <ProfilePhotoSection avatar={avatar} onChange={setAvatar} initials={initials} seed={user?.id ?? displayName} />
                        <Card style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="email" size={20} color={theme.roles.light.textSecondary} />
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>{t('settings.emailAddress')}</Text>
                                    <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
                                </View>
                            </View>

                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="account" size={20} color={theme.roles.light.textSecondary} />
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>{t('settings.fullName')}</Text>
                                    <Text style={styles.infoValue}>{displayName}</Text>
                                </View>
                            </View>

                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="phone" size={20} color={theme.roles.light.textSecondary} />
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>{t('settings.phoneNumber')}</Text>
                                    <Text style={styles.infoValue}>
                                        {profile?.phoneVerified && profile.phone ? `+${profile.phone}` : t('settings.profileNotSet')}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.infoRow, styles.noBorder]}>
                                <MaterialCommunityIcons name="calendar" size={20} color={theme.roles.light.textSecondary} />
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>{t('settings.memberSince')}</Text>
                                    <Text style={styles.infoValue}>
                                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                                    </Text>
                                </View>
                            </View>
                        </Card>

                    {user?.id && (
                        <Card style={styles.infoCard}>
                            <View style={styles.qrHeader}>
                                <MaterialCommunityIcons name="qrcode" size={20} color={theme.roles.light.primary} />
                                <Text style={styles.qrTitle}>{t('members.workerCode')}</Text>
                            </View>
                            <Text style={styles.qrHint}>{t('members.workerCodeHint')}</Text>
                            <View style={styles.qrBox}>
                                <QRCode
                                    value={`${WORKER_QR_PREFIX}${user.id}`}
                                    size={180}
                                    color={theme.roles.light.textPrimary}
                                    // White + quiet zone baked into the SVG so the shared PNG scans.
                                    backgroundColor="#FFFFFF"
                                    quietZone={16}
                                    getRef={(c) => { workerQrRef.current = c; }}
                                />
                            </View>
                            <Text style={styles.qrId} selectable>{user.id}</Text>
                            <View style={[styles.qrActions, { flexWrap: 'wrap' }]}>
                                <TouchableOpacity style={styles.qrActionBtn} onPress={handleCopyWorkerCode} accessibilityRole="button">
                                    <MaterialCommunityIcons name="content-copy" size={18} color={theme.roles.light.primary} />
                                    <Text style={styles.qrActionText}>{t('common.copy', 'Copy')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.qrActionBtn} onPress={handleShareWorkerCode} accessibilityRole="button">
                                    <MaterialCommunityIcons name="share-variant" size={18} color={theme.roles.light.primary} />
                                    <Text style={styles.qrActionText}>{t('members.qr.shareCode')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.qrActionBtn} onPress={handleShareWorkerQrImage} accessibilityRole="button">
                                    <MaterialCommunityIcons name="image-outline" size={18} color={theme.roles.light.primary} />
                                    <Text style={styles.qrActionText}>{t('members.qr.shareImage')}</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    )}

                    <Button
                        title={t('settings.account.entry')}
                        onPress={() => navigation.navigate('Account')}
                        style={styles.editBtn}
                        icon="account-cog"
                    />

                    <Button
                        title={t('settings.deleteAccount')}
                        onPress={handleDeleteAccount}
                        variant="outlined"
                        icon="account-remove"
                        style={styles.deleteBtn}
                        textStyle={{ color: theme.roles.light.dangerText }}
                    />
                    <Text style={styles.deleteHint}>{t('settings.deleteAccountHint')}</Text>
                </ScrollView>
            </Animated.View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    headerBackground: {
        backgroundColor: theme.roles.light.primary,
        paddingTop: theme.spacing[12],
        paddingBottom: theme.spacing[8],
        borderBottomLeftRadius: theme.radius.xl,
        borderBottomRightRadius: theme.radius.xl,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[4],
        marginBottom: theme.spacing[4],
    },
    headerTitle: {
        ...theme.typeScale.h3,
        color: theme.roles.light.surface,
    },
    profileInfoContainer: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.roles.light.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing[3],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    userName: {
        ...theme.typeScale.h2,
        color: theme.roles.light.surface,
        marginBottom: 4,
    },
    userEmail: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.surface + 'CC',
    },
    content: {
        padding: theme.spacing[4],
    },
    infoCard: {
        padding: theme.spacing[4],
        marginBottom: theme.spacing[6],
        marginTop: -theme.spacing[4],
    },
    qrHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[1] },
    qrTitle: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary },
    qrHint: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[4] },
    qrBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing[2] },
    qrId: { ...theme.typeScale.caption, color: theme.roles.light.textTertiary, textAlign: 'center', marginTop: theme.spacing[3] },
    qrActions: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing[5], marginTop: theme.spacing[4] },
    qrActionBtn: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1], padding: theme.spacing[2] },
    qrActionText: { ...theme.typeScale.labelMedium, color: theme.roles.light.primary, fontWeight: '600' },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    noBorder: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    infoTextContainer: {
        marginLeft: theme.spacing[4],
        flex: 1,
    },
    infoLabel: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textPrimary,
        fontWeight: '500',
    },
    deleteBtn: {
        marginTop: theme.spacing[4],
        borderColor: theme.roles.light.dangerText,
    },
    deleteHint: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing[2],
    },
    editBtn: {
        marginTop: theme.spacing[4],
    },
    mb2: {
        marginBottom: theme.spacing[2],
    },
    mb3: {
        marginBottom: theme.spacing[3],
    },
});