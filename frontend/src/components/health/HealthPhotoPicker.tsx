/**
 * Photos on a health record (D6). Online only: each photo uploads the moment
 * it is picked and the record keeps only its private storage path. Offline
 * the button is disabled with a reason — the record itself still saves.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { useSyncStore } from '../../store/syncStore';
import { healthObservationsApi } from '../../api/healthObservations';
import { pickHealthPhoto } from '../../features/healthPhoto';
import { apiErrorMessage } from '../../api/errors';

const c = theme.roles.light;

interface Props {
    pondId: string;
    /** Storage paths already attached. */
    value: string[];
    onChange: (paths: string[]) => void;
    /** Signed URLs of `value` when editing a saved record. */
    existingUrls?: string[];
    max?: number;
}

export const HealthPhotoPicker: React.FC<Props> = ({ pondId, value, onChange, existingUrls = [], max = 3 }) => {
    const { t } = useTranslation();
    const online = useSyncStore((s) => s.isConnected);
    const [local, setLocal] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const add = async (from: 'camera' | 'library') => {
        setBusy(true);
        try {
            const uri = await pickHealthPhoto(from);
            if (!uri) return;
            const { data } = await healthObservationsApi.uploadPhoto(pondId, uri);
            setLocal((l) => [...l, uri]);
            onChange([...value, data.path]);
        } catch (e) {
            Alert.alert(t('common.error'), apiErrorMessage(e, t('health.photoFailed')));
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

    const thumbs = [...existingUrls, ...local];
    const full = value.length >= max;
    const disabled = !online || busy || full;
    return (
        <View>
            {thumbs.length > 0 && (
                <View style={styles.row}>
                    {thumbs.map((u) => (
                        <Image key={u} source={{ uri: u }} style={styles.thumb} accessibilityIgnoresInvertColors />
                    ))}
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
        </View>
    );
};

const styles = StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[2] },
    thumb: { width: 72, height: 72, borderRadius: theme.radius.md, backgroundColor: c.surfaceVariant },
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
