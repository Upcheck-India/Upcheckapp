/**
 * F2 — Settings → Photos & storage (photos spec 2026-09-20).
 *
 * Two modes of one screen: with no params, the account's pool (totals, bar,
 * farm → pond breakdown, Free up space); with `pondId` (or `farmId` for
 * farm-level photos), that pond's photos by month, each naming its record.
 * Everything deletes through the server (F1 queue) and leaves a
 * "photo removed" line on the record. Protected photos are never offered by
 * Free up space; deleting one from its row takes an extra confirm.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PhotoStrip } from '../../components/ui/PhotoStrip';
import { theme } from '../../theme';
import { useUIStore } from '../../store/uiStore';
import { photosApi, type FreeUpOption, type PhotoItem, type PhotoUsage } from '../../api/photos';
import { formatBytes, groupByMonth, poolFraction, poolLevel } from '../../features/photoStorage';
import { formatDate } from '../../utils/formatDate';
import { PhotoPoolLine } from '../../components/photos/PhotoPool';

const c = theme.roles.light;

type Params = { pondId?: string; farmId?: string; name?: string } | undefined;

export const PhotoStorageScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const params: Params = route?.params;
    const detail = !!(params?.pondId || params?.farmId);
    const showToast = useUIStore((s) => s.showToast);

    const [usage, setUsage] = useState<PhotoUsage | null>(null);
    const [items, setItems] = useState<PhotoItem[] | null>(null);
    const [options, setOptions] = useState<FreeUpOption[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);

    const count = (n: number) => t('storage.photoCount', { count: n });

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            if (detail) {
                const { data } = await photosApi.items(
                    params?.pondId ? { pondId: params.pondId } : { farmId: params!.farmId! },
                );
                setItems(data);
            } else {
                const { data } = await photosApi.usage();
                setUsage(data);
            }
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [detail, params?.pondId, params?.farmId]);

    // Usage changes elsewhere (every upload, every record delete).
    useFocusEffect(useCallback(() => { load(); setOptions(null); }, [load]));

    const openFreeUp = async () => {
        setBusy(true);
        try {
            const { data } = await photosApi.freeUpOptions();
            setOptions(data);
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    // What will be freed is on the row AND in the confirm, before anything goes.
    const confirmFreeUp = (o: FreeUpOption) =>
        Alert.alert(
            t('storage.confirmTitle'),
            t('storage.confirmBody', { photos: count(o.photos), bytes: formatBytes(o.bytes) }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('storage.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setBusy(true);
                        try {
                            const { data } = await photosApi.freeUp(o.kind, o.id);
                            showToast({ message: t('storage.freed', { photos: count(data.photos) }), type: 'success' });
                            setOptions(null);
                            await load();
                        } catch {
                            showToast({ message: t('storage.actionFailed'), type: 'error' });
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ],
        );

    const removeItem = async (item: PhotoItem) => {
        try {
            await photosApi.removeItem(item.path);
            showToast({ message: t('storage.deleted'), type: 'success' });
            await load();
        } catch {
            showToast({ message: t('storage.actionFailed'), type: 'error' });
        }
    };

    // A protected photo gets its own, explicit warning (§F2.4) — never the plain confirm.
    const confirmRemove = (item: PhotoItem) =>
        Alert.alert(
            item.protected ? t('storage.deleteProtectedTitle') : t('storage.deleteOneTitle'),
            item.protected ? t('storage.deleteProtectedBody') : t('storage.deleteOneBody'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: item.protected ? t('storage.deleteAnyway') : t('storage.delete'),
                    style: 'destructive',
                    onPress: () => void removeItem(item),
                },
            ],
        );

    const title = detail ? t('storage.pondPhotosTitle', { name: params?.name ?? '' }) : t('storage.title');

    return (
        <ScreenWrapper refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
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
                <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            </View>

            {failed && <Text style={styles.error}>{t('storage.loadFailed')}</Text>}

            {detail ? (
                items && items.length === 0 ? (
                    <Text style={styles.note}>{t('storage.empty')}</Text>
                ) : (
                    groupByMonth(items ?? []).map((g) => (
                        <View key={g.month}>
                            <Text style={styles.section}>{formatDate(`${g.month}-15`, { month: 'long', year: 'numeric' })}</Text>
                            <Card style={styles.card}>
                                {g.items.map((it) => (
                                    <View key={it.path} style={styles.itemRow}>
                                        {it.url ? (
                                            <PhotoStrip full={[it.url]} thumbs={it.thumbUrl ? [it.thumbUrl] : undefined} size={56} />
                                        ) : (
                                            <View style={styles.thumbPlaceholder} />
                                        )}
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={styles.rowLabel} numberOfLines={1}>
                                                {t(`storage.entity.${it.entity ?? 'none'}`, { defaultValue: t('storage.entity.none') })}
                                            </Text>
                                            <Text style={styles.rowSub}>
                                                {formatDate(it.uploadedAt, { day: 'numeric', month: 'short', year: 'numeric' })} · {formatBytes(it.bytes)}
                                            </Text>
                                            {it.protected && <Text style={styles.badge}>{t('storage.protectedBadge')}</Text>}
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => confirmRemove(it)}
                                            hitSlop={12}
                                            accessibilityRole="button"
                                            accessibilityLabel={t('storage.delete')}
                                        >
                                            <MaterialCommunityIcons name="trash-can-outline" size={22} color={c.dangerText} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </Card>
                        </View>
                    ))
                )
            ) : usage ? (
                <>
                    <Card style={styles.card}>
                        <Text style={styles.value}>
                            {count(usage.photos)} · {t('storage.ofLimit', { used: formatBytes(usage.bytes), limit: formatBytes(usage.limits.bytes) })}
                        </Text>
                        <View style={styles.barTrack}>
                            <View
                                style={[
                                    styles.barFill,
                                    { width: `${Math.min(100, Math.round(poolFraction(usage, usage.limits) * 100))}%` },
                                    poolLevel(usage, usage.limits) !== 'ok' && { backgroundColor: c.warningBorder },
                                ]}
                            />
                        </View>
                        <PhotoPoolLine pool={usage} link={false} />
                        <Text style={styles.note}>
                            {t('storage.limitRule', { photos: usage.limits.photos, bytes: formatBytes(usage.limits.bytes) })}
                        </Text>
                        {usage.incomplete && <Text style={styles.note}>{t('storage.incomplete')}</Text>}
                    </Card>

                    {usage.farms.length === 0 && usage.account.photos === 0 && (
                        <Text style={styles.note}>{t('storage.empty')}</Text>
                    )}
                    {usage.farms.map((f) => (
                        <Card key={f.farmId} style={styles.card}>
                            <View style={styles.farmRow}>
                                <Text style={[styles.rowLabel, { flex: 1 }]} numberOfLines={1}>{f.name}</Text>
                                <Text style={styles.rowSub}>{count(f.photos)} · {formatBytes(f.bytes)}</Text>
                            </View>
                            {f.ponds.map((p) => {
                                const name = p.name ?? t('storage.farmLevel');
                                return (
                                    <TouchableOpacity
                                        key={p.pondId ?? 'farm'}
                                        style={styles.pondRow}
                                        accessibilityRole="button"
                                        onPress={() =>
                                            navigation.push('PhotoStorage', p.pondId ? { pondId: p.pondId, name } : { farmId: f.farmId, name })
                                        }
                                    >
                                        <Text style={[styles.rowSub, { flex: 1 }]} numberOfLines={1}>{name}</Text>
                                        <Text style={styles.rowSub}>{count(p.photos)} · {formatBytes(p.bytes)}</Text>
                                        <MaterialCommunityIcons name="chevron-right" size={20} color={c.textDisabled} />
                                    </TouchableOpacity>
                                );
                            })}
                        </Card>
                    ))}
                    {usage.account.photos > 0 && (
                        <Card style={styles.card}>
                            <View style={styles.farmRow}>
                                <Text style={[styles.rowLabel, { flex: 1 }]}>{t('storage.account')}</Text>
                                <Text style={styles.rowSub}>{count(usage.account.photos)} · {formatBytes(usage.account.bytes)}</Text>
                            </View>
                        </Card>
                    )}

                    {options === null ? (
                        <Button title={t('storage.freeUp')} variant="outlined" onPress={openFreeUp} loading={busy} disabled={usage.photos === 0} />
                    ) : (
                        <>
                            <Text style={styles.section}>{t('storage.freeUp')}</Text>
                            <Text style={[styles.note, { marginBottom: theme.spacing[3] }]}>{t('storage.freeUpIntro')}</Text>
                            {options.length === 0 && <Text style={styles.note}>{t('storage.nothingToFree')}</Text>}
                            {(['crop', 'pond'] as const).map((kind) => {
                                const list = options.filter((o) => o.kind === kind);
                                if (!list.length) return null;
                                return (
                                    <Card key={kind} style={styles.card}>
                                        <Text style={styles.rowLabel}>{kind === 'crop' ? t('storage.closedCycles') : t('storage.ponds')}</Text>
                                        {list.map((o) => (
                                            <TouchableOpacity
                                                key={o.id}
                                                style={styles.pondRow}
                                                disabled={o.photos === 0 || busy}
                                                onPress={() => confirmFreeUp(o)}
                                                accessibilityRole="button"
                                            >
                                                <View style={{ flex: 1, minWidth: 0 }}>
                                                    <Text style={styles.rowSub} numberOfLines={1}>
                                                        {[o.farmName, o.pondName, o.name].filter(Boolean).join(' · ')}
                                                    </Text>
                                                    <Text style={styles.rowSubMuted}>
                                                        {count(o.photos)} · {t('storage.willFree', { bytes: formatBytes(o.bytes) })}
                                                        {o.protected > 0 ? ` · ${t('storage.protectedStay', { count: o.protected })}` : ''}
                                                    </Text>
                                                </View>
                                                {busy ? (
                                                    <ActivityIndicator color={c.primary} />
                                                ) : (
                                                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={o.photos ? c.dangerText : c.textDisabled} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </Card>
                                );
                            })}
                        </>
                    )}
                </>
            ) : null}
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
    headerTitle: { ...theme.typeScale.h3, color: c.textPrimary, flex: 1 },
    section: {
        ...theme.typeScale.labelLarge,
        color: c.textPrimary,
        fontWeight: '600',
        marginBottom: theme.spacing[2],
    },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[4], gap: theme.spacing[2] },
    value: { ...theme.typeScale.bodyLarge, color: c.textPrimary, fontWeight: '500' },
    note: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    error: { ...theme.typeScale.bodySmall, color: c.dangerText, marginBottom: theme.spacing[3] },
    barTrack: { height: 8, borderRadius: 4, backgroundColor: c.surfaceVariant, overflow: 'hidden' },
    barFill: { height: 8, backgroundColor: c.primary },
    farmRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
    pondRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        minHeight: 44,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.borderDefault,
    },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], minHeight: 64 },
    thumbPlaceholder: { width: 56, height: 56, borderRadius: theme.radius.md, backgroundColor: c.surfaceVariant },
    rowLabel: { ...theme.typeScale.labelLarge, color: c.textPrimary },
    rowSub: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    rowSubMuted: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    badge: { ...theme.typeScale.labelSmall, color: c.warningText },
});
