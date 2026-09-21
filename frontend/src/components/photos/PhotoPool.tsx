/**
 * F2: the account photo pool's quiet line — nothing below 80%, "N% full" from
 * 80%, "Storage full — free up space" at 100%. Shown in Settings, on the
 * photo picker and on the storage screen; tapping it opens Photos & storage.
 */
import React, { useContext, useEffect, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { photosApi, type PhotoLimits } from '../../api/photos';
import { poolFraction, poolLevel } from '../../features/photoStorage';
import { useSyncStore } from '../../store/syncStore';

const c = theme.roles.light;

export type Pool = { photos: number; bytes: number; limits: PhotoLimits };

/**
 * The pool a pond's uploads count against (its farm owner's), or with no
 * pond the caller's own. Fetched on mount and on every focus of the screen
 * (screens stay mounted); null offline or on failure — the server still
 * enforces the limit, this is only the early warning. Reads the navigation
 * context directly so it also works outside a navigator.
 */
export function usePhotoPool(pondId?: string): Pool | null {
    const online = useSyncStore((s) => s.isConnected);
    const navigation = useContext(NavigationContext);
    const [pool, setPool] = useState<Pool | null>(null);
    useEffect(() => {
        if (!online) return;
        let live = true;
        const load = () =>
            (pondId ? photosApi.quotaForPond(pondId) : photosApi.usage())
                .then(({ data }) => live && setPool({ photos: data.photos, bytes: data.bytes, limits: data.limits }))
                .catch(() => undefined);
        load();
        const unsubscribe = navigation?.addListener('focus', load);
        return () => {
            live = false;
            unsubscribe?.();
        };
    }, [online, pondId, navigation]);
    return pool;
}

export const PhotoPoolLine: React.FC<{ pool: Pool | null; link?: boolean }> = ({ pool, link = true }) => {
    const { t } = useTranslation();
    const navigation = useContext(NavigationContext);
    if (!pool) return null;
    const level = poolLevel(pool, pool.limits);
    if (level === 'ok') return null;
    const text =
        level === 'full'
            ? t('storage.full')
            : t('storage.nearlyFull', { pct: Math.floor(poolFraction(pool, pool.limits) * 100) });
    const line = <Text style={styles.line}>{text}</Text>;
    if (!link || !navigation) return line;
    return (
        <TouchableOpacity onPress={() => navigation.navigate('PhotoStorage')} accessibilityRole="link" hitSlop={8}>
            {line}
        </TouchableOpacity>
    );
};

/** Settings: the caller's own pool. */
export const PhotoPoolNote: React.FC = () => <PhotoPoolLine pool={usePhotoPool()} />;

const styles = StyleSheet.create({
    line: { ...theme.typeScale.bodySmall, color: c.warningText, marginTop: theme.spacing[1] },
});
