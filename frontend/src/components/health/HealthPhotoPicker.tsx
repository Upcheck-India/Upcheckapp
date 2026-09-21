/**
 * Photos on a health record (D6). Online only: each photo uploads the moment
 * it is picked and the record keeps only its private storage path. Offline
 * the button is disabled with a reason — the record itself still saves.
 */
import React, { useContext, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { useSyncStore } from '../../store/syncStore';
import { healthObservationsApi } from '../../api/healthObservations';
import { pickHealthPhoto } from '../../features/healthPhoto';
import { apiErrorMessage } from '../../api/errors';
import { photoErrorMessage } from '../../features/photoErrors';
import { PhotoStrip } from '../ui/PhotoStrip';
import { PhotoPoolLine, usePhotoPool } from '../photos/PhotoPool';
import { poolLevel } from '../../features/photoStorage';

const c = theme.roles.light;

interface Props {
    pondId: string;
    /** Storage paths already attached. */
    value: string[];
    onChange: (paths: string[]) => void;
    /** Signed URLs of `value` when editing a saved record. */
    existingUrls?: string[];
    /** Their thumbnails, same order. */
    existingThumbs?: string[];
    max?: number;
}

export const HealthPhotoPicker: React.FC<Props> = ({ pondId, value, onChange, existingUrls = [], existingThumbs = [], max = 3 }) => {
    const { t } = useTranslation();
    const online = useSyncStore((s) => s.isConnected);
    const [local, setLocal] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const navigation = useContext(NavigationContext);
    // F2: the pond owner's pool. At 100% the button is off and the line links
    // to Photos & storage; the record itself always saves.
    const pool = usePhotoPool(pondId);
    const [refusedFull, setRefusedFull] = useState(false);
    const poolFull = refusedFull || (!!pool && poolLevel(pool, pool.limits) === 'full');

    const add = async (from: 'camera' | 'library') => {
        setBusy(true);
        try {
            const uri = await pickHealthPhoto(from);
            if (!uri) return;
            const { data } = await healthObservationsApi.uploadPhoto(pondId, uri);
            setLocal((l) => [...l, uri]);
            onChange([...value, data.path]);
        } catch (e) {
            if ((e as any)?.response?.data?.code === 'STORAGE_FULL') {
                setRefusedFull(true);
                Alert.alert(t('storage.full'), t('storage.pickerFull'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    ...(navigation ? [{ text: t('storage.freeUp'), onPress: () => navigation.navigate('PhotoStorage') }] : []),
                ]);
                return;
            }
            Alert.alert(t('common.error'), photoErrorMessage(e, t, apiErrorMessage(e, t('health.photoFailed'))));
        } finally {
            setBusy(false);
        }
    };

    const choose = () =>
        Alert.alert(t('health.addPhoto'), undefined, [
            { text: t('health.takePhoto'), onPress: () => void add('camera') },
            { text: t('health.fromGallery'), onPress: () => void add('library') },
            { text: t('common.cancel'), style: 'cancel' },
        ]);

    /**
     * P2: removing an EXISTING (already-saved) photo just drops its path —
     * the record's own PATCH, when the form is saved, diffs the array and
     * deletes the object server side (see mortality/disease `update`).
     * Removing a NOT-yet-saved (this-session) pick deletes the just-uploaded
     * object immediately, since nothing else will ever clean it up if the
     * form is abandoned.
     */
    const remove = async (index: number) => {
        const path = value[index];
        onChange(value.filter((_, i) => i !== index));
        if (index < existingUrls.length) return; // saved photo: cleaned up on next save
        setLocal((l) => l.filter((_, i) => i !== index - existingUrls.length));
        try {
            await healthObservationsApi.removePhoto(pondId, path);
        } catch (e) {
            // Never blocks the UI — the photo is already gone from this record's
            // draft. F1: once the deletion queue exists this becomes a durable
            // retry instead of a best-effort call that can leave an orphan.
            Alert.alert(t('common.error'), photoErrorMessage(e, t, t('health.photoRemoveFailed')));
        }
    };

    const fullUrls = [...existingUrls, ...local];
    // Local picks are their own thumbnails.
    const thumbUrls = [...existingUrls.map((u, i) => existingThumbs[i] || u), ...local];
    const full = value.length >= max;
    const disabled = !online || busy || full || poolFull;
    return (
        <View>
            {fullUrls.length > 0 && (
                <View style={styles.row}>
                    <PhotoStrip full={fullUrls} thumbs={thumbUrls} onRemove={(i) => void remove(i)} />
                </View>
            )}
            <TouchableOpacity
                style={[styles.btn, disabled && styles.btnDisabled]}
                onPress={choose}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                testID="health-photo-btn"
            >
                {busy ? (
                    <ActivityIndicator color={c.primary} />
                ) : (
                    <MaterialCommunityIcons name="camera-plus-outline" size={20} color={disabled ? c.textDisabled : c.primary} />
                )}
                <Text style={[styles.btnText, disabled && { color: c.textDisabled }]}>{t('health.addPhoto')}</Text>
            </TouchableOpacity>
            {!online && <Text style={styles.note}>{t('health.photosNeedConnection')}</Text>}
            {online && <PhotoPoolLine pool={refusedFull && pool ? { ...pool, photos: pool.limits.photos } : pool} />}
        </View>
    );
};

const styles = StyleSheet.create({
    row: { marginBottom: theme.spacing[2] },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: c.primary,
    },
    btnDisabled: { borderColor: c.borderDefault },
    btnText: { ...theme.typeScale.labelMedium, color: c.primary },
    note: { ...theme.typeScale.bodySmall, color: c.textTertiary, marginTop: theme.spacing[1] },
});
