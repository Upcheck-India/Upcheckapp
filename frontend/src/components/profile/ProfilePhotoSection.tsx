/**
 * The caller's profile picture: change (camera or gallery, square crop),
 * remove (deleted from the server and its storage), and who may see it.
 * Online only, like health photos — nothing here is queued offline.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { Card } from '../ui/Card';
import { Avatar, evictCachedImage } from '../ui/Avatar';
import { profilesApi, type MyAvatar } from '../../api/profiles';
import { pickAvatarPhoto } from '../../features/healthPhoto';
import { apiErrorMessage } from '../../api/errors';
import { photoErrorMessage } from '../../features/photoErrors';
import { useSyncStore } from '../../store/syncStore';

const c = theme.roles.light;

interface Props {
    avatar: MyAvatar;
    onChange: (next: MyAvatar) => void;
    initials: string;
    seed: string;
}

export const ProfilePhotoSection: React.FC<Props> = ({ avatar, onChange, initials, seed }) => {
    const { t } = useTranslation();
    const online = useSyncStore((s) => s.isConnected);
    const [busy, setBusy] = useState(false);

    /** Apply the server's answer and drop the replaced picture's cached bytes. */
    const apply = async (next: MyAvatar) => {
        const gone = [avatar.avatarUrl, avatar.avatarThumbUrl].filter((u) => u && u !== next.avatarUrl && u !== next.avatarThumbUrl);
        onChange(next);
        await Promise.all(gone.map(evictCachedImage));
    };

    const change = async (from: 'camera' | 'library') => {
        setBusy(true);
        try {
            const uri = await pickAvatarPhoto(from);
            if (!uri) return;
            const { data } = await profilesApi.uploadAvatar(uri);
            await apply(data);
        } catch (e) {
            Alert.alert(t('common.error'), photoErrorMessage(e, t, apiErrorMessage(e, t('settings.avatar.uploadFailed'))));
        } finally {
            setBusy(false);
        }
    };

    const chooseSource = () =>
        Alert.alert(t('settings.avatar.changePhoto'), undefined, [
            { text: t('settings.avatar.takePhoto'), onPress: () => void change('camera') },
            { text: t('settings.avatar.fromGallery'), onPress: () => void change('library') },
            { text: t('common.cancel'), style: 'cancel' },
        ]);

    const confirmRemove = () =>
        Alert.alert(t('settings.avatar.removeConfirmTitle'), t('settings.avatar.removeConfirmBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('settings.avatar.removePhoto'),
                style: 'destructive',
                onPress: async () => {
                    setBusy(true);
                    try {
                        const { data } = await profilesApi.removeAvatar();
                        await apply(data);
                    } catch (e) {
                        Alert.alert(t('common.error'), photoErrorMessage(e, t, apiErrorMessage(e, t('settings.avatar.uploadFailed'))));
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);

    const toggle = async (show: boolean) => {
        onChange({ ...avatar, showAvatarToTeam: show });
        try {
            const { data } = await profilesApi.setAvatarVisibility(show);
            onChange(data);
        } catch (e) {
            onChange({ ...avatar, showAvatarToTeam: !show });
            Alert.alert(t('common.error'), photoErrorMessage(e, t, apiErrorMessage(e, t('settings.avatar.visibilityFailed'))));
        }
    };

    const disabled = busy || !online;
    return (
        <Card style={styles.card}>
            <View style={styles.row}>
                <View accessible accessibilityLabel={t('settings.avatar.a11yPhoto')}>
                    <Avatar uri={avatar.avatarThumbUrl} initials={initials} seed={seed} size={64} testID="my-avatar" />
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.btn, disabled && styles.btnDisabled]}
                        onPress={chooseSource}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityState={{ disabled }}
                        testID="avatar-change"
                    >
                        {busy ? (
                            <ActivityIndicator color={c.primary} />
                        ) : (
                            <MaterialCommunityIcons name="camera-outline" size={18} color={disabled ? c.textDisabled : c.primary} />
                        )}
                        <Text style={[styles.btnText, disabled && { color: c.textDisabled }]}>
                            {avatar.avatarUrl ? t('settings.avatar.changePhoto') : t('settings.avatar.addPhoto')}
                        </Text>
                    </TouchableOpacity>
                    {avatar.hasUploadedAvatar && (
                        <TouchableOpacity
                            style={[styles.btn, styles.removeBtn, disabled && styles.btnDisabled]}
                            onPress={confirmRemove}
                            disabled={disabled}
                            accessibilityRole="button"
                            accessibilityState={{ disabled }}
                            testID="avatar-remove"
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={18} color={disabled ? c.textDisabled : c.dangerText} />
                            <Text style={[styles.btnText, { color: disabled ? c.textDisabled : c.dangerText }]}>
                                {t('settings.avatar.removePhoto')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {!online && <Text style={styles.note}>{t('settings.avatar.needsConnection')}</Text>}
            <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                    <Text style={styles.toggleLabel}>{t('settings.avatar.showToTeam')}</Text>
                    <Text style={styles.note}>{t('settings.avatar.showToTeamHint')}</Text>
                </View>
                <Switch
                    value={avatar.showAvatarToTeam}
                    onValueChange={toggle}
                    disabled={!online}
                    accessibilityLabel={t('settings.avatar.showToTeam')}
                    testID="avatar-visibility"
                />
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: { marginBottom: theme.spacing[4] },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] },
    actions: { flex: 1, gap: theme.spacing[2] },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        alignSelf: 'flex-start',
        minHeight: 44,
        paddingHorizontal: theme.spacing[3],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: c.primary,
    },
    removeBtn: { borderColor: c.dangerText },
    btnDisabled: { borderColor: c.borderDefault },
    btnText: { ...theme.typeScale.labelMedium, color: c.primary },
    note: { ...theme.typeScale.bodySmall, color: c.textTertiary, marginTop: theme.spacing[1] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], marginTop: theme.spacing[4] },
    toggleText: { flex: 1 },
    toggleLabel: { ...theme.typeScale.bodyMedium, color: c.textPrimary },
});
