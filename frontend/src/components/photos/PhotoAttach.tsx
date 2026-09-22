/**
 * F5: the shared photo attach control for every new surface (money proof,
 * input label, identity, condition) — `HealthPhotoPicker` generalised.
 * Camera first (PD5); for receipts/certificates/labels the two source
 * buttons are equal weight (spec F5), matched here via `equalWeight`.
 *
 * Online only: each photo uploads the moment it is picked and the caller
 * keeps only its private storage path. Offline the button is disabled with a
 * reason — the record itself still saves without the photo (§F5 rule).
 */
import React, { useContext, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { useSyncStore } from '../../store/syncStore';
import { PHOTO_CAPS, photosApi, type PhotoSurfaceKey } from '../../api/photos';
import { pickHealthPhoto } from '../../features/healthPhoto';
import { apiErrorMessage } from '../../api/errors';
import { photoErrorMessage } from '../../features/photoErrors';
import { PhotoStrip } from '../ui/PhotoStrip';
import { usePhotoPool } from '../photos/PhotoPool';
import { poolLevel } from '../../features/photoStorage';
import { usePhotoTermsStore } from '../../store/photoTermsStore';

const c = theme.roles.light;

interface Props {
    surface: PhotoSurfaceKey;
    /** Which id scopes the upload — a pond for most surfaces, a farm for the rest. */
    scope: { pondId: string } | { farmId: string };
    /** Storage paths already attached. */
    value: string[];
    onChange: (paths: string[]) => void;
    existingUrls?: string[];
    existingThumbs?: string[];
    /** Defaults to the surface's cap (PHOTO_CAPS, mirrored from the backend). */
    max?: number;
    /** Receipts/certificates/labels: camera and gallery are equal weight (PD5). */
    equalWeight?: boolean;
}

export const PhotoAttach: React.FC<Props> = ({
    surface,
    scope,
    value,
    onChange,
    existingUrls = [],
    existingThumbs = [],
    max = PHOTO_CAPS[surface],
    equalWeight = false,
}) => {
    const { t } = useTranslation();
    const online = useSyncStore((s) => s.isConnected);
    const [local, setLocal] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const navigation = useContext(NavigationContext);
    const acked = usePhotoTermsStore((s) => s.acked);
    const setAcked = usePhotoTermsStore((s) => s.setAcked);

    const pondId = 'pondId' in scope ? scope.pondId : undefined;
    const pool = usePhotoPool(pondId);
    const [refusedFull, setRefusedFull] = useState(false);
    const poolFull = refusedFull || (!!pool && poolLevel(pool, pool.limits) === 'full');

    const doUpload = async (from: 'camera' | 'library') => {
        setBusy(true);
        try {
            const uri = await pickHealthPhoto(from);
            if (!uri) return;
            const { data } =
                'pondId' in scope
                    ? await photosApi.uploadForPond(scope.pondId, surface, uri)
                    : await photosApi.uploadForFarm(scope.farmId, surface, uri);
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
            Alert.alert(t('common.error'), photoErrorMessage(e, t, apiErrorMessage(e, t('photos.uploadFailed'))));
        } finally {
            setBusy(false);
        }
    };

    // F8.1: the first upload on the account gets one acknowledgement before
    // anything is picked, via the same Alert the picker already uses — no
    // separate dialog component needed. Every upload after that goes straight
    // through, on this device and (once synced) on any other.
    const add = (from: 'camera' | 'library') => {
        if (acked) {
            void doUpload(from);
            return;
        }
        Alert.alert(t('photos.ackTitle'), t('photos.ackBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('photos.ackAccept'),
                onPress: () => {
                    setAcked();
                    void doUpload(from);
                },
            },
        ]);
    };

    // `equalWeight` (receipts/certificates/labels) is a prop hook for a future
    // side-by-side two-button layout; an OS action sheet has no visual "primary"
    // slot to differ on, so both paths list camera first, gallery second today.
    // ponytail: single chooser, add the two-button layout when a surface needs it.
    const choose = () =>
        Alert.alert(t('photos.addPhoto'), t(`photos.surface.${surface}`), [
            { text: t('photos.takePhoto'), onPress: () => add('camera') },
            { text: t('photos.fromGallery'), onPress: () => add('library') },
            { text: t('common.cancel'), style: 'cancel' },
        ]);

    const remove = async (index: number) => {
        const path = value[index];
        onChange(value.filter((_, i) => i !== index));
        if (index < existingUrls.length) return; // saved photo: cleaned up on next save
        setLocal((l) => l.filter((_, i) => i !== index - existingUrls.length));
        try {
            if ('pondId' in scope) await photosApi.removeForPond(scope.pondId, path);
            else await photosApi.removeForFarm(scope.farmId, path);
        } catch (e) {
            // Never blocks the UI — the photo is already gone from this
            // form's draft. F1's 24h orphan sweep collects it either way if
            // this best-effort call fails.
            Alert.alert(t('common.error'), photoErrorMessage(e, t, t('photos.removeFailed')));
        }
    };

    const fullUrls = [...existingUrls, ...local];
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
                testID={`photo-attach-${surface}`}
            >
                {busy ? (
                    <ActivityIndicator size="small" color={c.textSecondary} />
                ) : (
                    <>
                        <MaterialCommunityIcons name="camera-plus-outline" size={18} color={c.textSecondary} />
                        <Text style={styles.btnText}>{t('photos.addPhoto')}</Text>
                        <Text style={styles.optional}>{t('photos.optional')}</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    row: { marginBottom: 8 },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.borderDefault,
        alignSelf: 'flex-start',
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: c.textSecondary, fontWeight: '600' },
    optional: { color: c.textSecondary, fontSize: 11, marginLeft: 4 },
});
