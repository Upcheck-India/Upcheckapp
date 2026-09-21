/**
 * F3 — the honest part of retention (photos spec 2026-09-20, PD4):
 * - `PhotoRetentionHint`: at the photo picker, once per account, a line the
 *   farmer can dismiss: full size 12 months, then a small version; save any time.
 * - `PhotoRetentionNotice`: the one in-app notice (not a push) 30 days before
 *   photos shrink, with a button to back them up. Reading it is what starts
 *   the account's 30-day clock on the server — nothing is downgraded before
 *   the farmer could have seen this.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { photosApi, type PhotoRetention } from '../../api/photos';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';
import { formatDate } from '../../utils/formatDate';

const c = theme.roles.light;

/** A per-account "seen it" flag. Unreadable storage → treat as seen (never nag). */
function useDismissed(key: string | null): [boolean, () => void] {
    const [dismissed, setDismissed] = useState(true);
    useEffect(() => {
        if (!key) return;
        let live = true;
        AsyncStorage.getItem(key)
            .then((v) => live && setDismissed(v === '1'))
            .catch(() => undefined);
        return () => {
            live = false;
        };
    }, [key]);
    const dismiss = () => {
        setDismissed(true);
        if (key) AsyncStorage.setItem(key, '1').catch(() => undefined);
    };
    return [dismissed, dismiss];
}

const CloseX: React.FC<{ onPress: () => void; label: string }> = ({ onPress, label }) => (
    <TouchableOpacity onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={label}>
        <MaterialCommunityIcons name="close" size={16} color={c.textSecondary} />
    </TouchableOpacity>
);

export const PhotoRetentionHint: React.FC = () => {
    const { t } = useTranslation();
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const [dismissed, dismiss] = useDismissed(userId ? `upcheck-photo-retention-hint:${userId}` : null);
    if (dismissed) return null;
    return (
        <View style={styles.hint} testID="photo-retention-hint">
            <Text style={styles.hintText}>{t('storage.retention.hint')}</Text>
            <CloseX onPress={dismiss} label={t('common.close')} />
        </View>
    );
};

/** The server's retention facts; null offline or on failure. Refetched on each mount. */
export function usePhotoRetention(): PhotoRetention | null {
    const online = useSyncStore((s) => s.isConnected);
    const [data, setData] = useState<PhotoRetention | null>(null);
    useEffect(() => {
        if (!online) return;
        let live = true;
        photosApi
            .retention()
            .then(({ data: d }) => live && setData(d))
            .catch(() => undefined);
        return () => {
            live = false;
        };
    }, [online]);
    return data;
}

/** "42 photos from Sep 2025 shrink to small copies on 20 Oct. Back them up first." */
export const RetentionNoticeCard: React.FC<{
    upcoming: NonNullable<PhotoRetention['upcoming']>;
    onBackup: () => void;
    onDismiss?: () => void;
}> = ({ upcoming, onBackup, onDismiss }) => {
    const { t } = useTranslation();
    return (
        <View style={styles.notice} testID="photo-retention-notice">
            <View style={styles.noticeRow}>
                <MaterialCommunityIcons name="image-size-select-small" size={20} color={c.warningText} />
                <Text style={styles.noticeText}>
                    {t('storage.retention.notice', {
                        photos: t('storage.photoCount', { count: upcoming.photos }),
                        month: formatDate(upcoming.since, { month: 'short', year: 'numeric' }),
                        date: formatDate(upcoming.date, { day: 'numeric', month: 'short' }),
                    })}
                </Text>
                {onDismiss && <CloseX onPress={onDismiss} label={t('common.close')} />}
            </View>
            <TouchableOpacity onPress={onBackup} accessibilityRole="button" style={styles.noticeBtn}>
                <Text style={styles.noticeBtnText}>{t('storage.retention.backupNow')}</Text>
            </TouchableOpacity>
        </View>
    );
};

/** Home: shown until dismissed, once per upcoming date. */
export const PhotoRetentionNotice: React.FC<{ onBackup: () => void }> = ({ onBackup }) => {
    const retention = usePhotoRetention();
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const upcoming = retention?.upcoming ?? null;
    const [dismissed, dismiss] = useDismissed(
        userId && upcoming ? `upcheck-photo-retention-notice:${userId}:${upcoming.date.slice(0, 10)}` : null,
    );
    if (!upcoming || dismissed) return null;
    return <RetentionNoticeCard upcoming={upcoming} onBackup={onBackup} onDismiss={dismiss} />;
};

const styles = StyleSheet.create({
    hint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing[2],
        marginTop: theme.spacing[2],
    },
    hintText: { ...theme.typeScale.bodySmall, color: c.textSecondary, flex: 1 },
    notice: {
        backgroundColor: c.warningBg,
        borderColor: c.warningBorder,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        padding: theme.spacing[3],
        marginBottom: theme.spacing[4],
        gap: theme.spacing[2],
    },
    noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[2] },
    noticeText: { ...theme.typeScale.bodyMedium, color: c.textPrimary, flex: 1 },
    noticeBtn: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    noticeBtnText: { ...theme.typeScale.labelLarge, color: c.primary },
});
