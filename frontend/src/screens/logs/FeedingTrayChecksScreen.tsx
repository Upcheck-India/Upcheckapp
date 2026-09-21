import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useCachedFetch } from '../../query/hooks';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Stepper } from '../../components/ui/Stepper';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { EmptyState } from '../../components/ui/EmptyState';
import { theme } from '../../theme';
import { feedingTrayApi, type FeedingTrayCheck, type TrayResidue } from '../../api/feedingTray';
import { apiErrorMessage } from '../../api/errors';
import { useUIStore } from '../../store/uiStore';
import { toLocalISODate } from '../../utils/localDate';
import { saveRecord } from '../../sync/recordSync';
import { cropsApi } from '../../api/crops';
import { PhotoAttach } from '../../components/photos/PhotoAttach';

const c = theme.roles.light;
const RESIDUE_LABEL: Record<TrayResidue, string> = {
    empty: 'Empty (eat more)',
    few_left: 'A few left',
    a_lot_left: 'A lot left (reduce)',
};

export const FeedingTrayChecksScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { cropId, pondName } = route.params ?? {};

    const [trayNumber, setTrayNumber] = useState(1);
    const [residue, setResidue] = useState<TrayResidue>('few_left');
    const [saving, setSaving] = useState(false);
    // Paints the last list instantly and revalidates on every focus; a failed
    // refresh keeps the list rather than wiping it.
    const { data, refetch } = useCachedFetch(
        ['feedingTrayChecks', cropId ?? null],
        async (): Promise<FeedingTrayCheck[]> => (await feedingTrayApi.getByCrop(cropId)).data,
    );
    const checks = data ?? [];
    const load = () => void refetch();
    // F5: tray photo (cap 1). Not in route params — resolved from the crop.
    const [pondId, setPondId] = useState<string | undefined>(route.params?.pondId);
    const [photoPath, setPhotoPath] = useState<string | undefined>(undefined);

    React.useEffect(() => {
        if (pondId || !cropId) return;
        cropsApi.getById(cropId).then(({ data }) => setPondId(data.pondId)).catch(() => undefined);
    }, [cropId, pondId]);

    const save = async () => {
        setSaving(true);
        try {
            const now = new Date();
            const res = await saveRecord({
                entity: 'feeding_tray_check',
                endpoint: '/feeding-tray-checks',
                payload: {
                    cropId,
                    checkDate: toLocalISODate(now),
                    checkTime: now.toTimeString().slice(0, 5),
                    trayNumber,
                    remainingFeedStatus: residue,
                    ...(photoPath !== undefined ? { photoPath } : {}),
                },
            });
            setPhotoPath(undefined);
            showToast({
                message: res.queued
                    ? t('common.savedOffline', 'Saved — will sync when online')
                    : t('common.savedSuccess'),
                type: 'success',
            });
            // Offline the refetch would just fail for a check that's safely
            // queued. Skip it and let the next focus/reconnect pick up the
            // real list.
            if (!res.queued) load();
        } catch (e: any) {
            Alert.alert(t('common.error'), apiErrorMessage(e, t('logs.feedingTray_errorSave', 'Could not save tray check')));
        } finally {
            setSaving(false);
        }
    };

    const renderItem = ({ item }: { item: FeedingTrayCheck }) => (
        <Card style={styles.checkRow}>
            <MaterialCommunityIcons name="basket-outline" size={20} color={c.primary} />
            <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>{t('logs.feedingTray_tray', { n: item.trayNumber, defaultValue: `Tray ${item.trayNumber}` })}</Text>
                <Text style={styles.checkMeta}>{item.checkDate} {item.checkTime} · {t(`logs.feedingTray_${item.remainingFeedStatus}`, RESIDUE_LABEL[item.remainingFeedStatus])}</Text>
            </View>
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={c.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>{t('logs.feedingTray_title', 'Feeding tray check')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {pondName ? <Text style={styles.subtitle}>{t('logs.loggingFor', { pondName })}</Text> : null}

                <Card style={styles.card}>
                    <Stepper label={t('logs.feedingTray_trayNumber', 'Tray number')} value={trayNumber} onChange={setTrayNumber} min={1} max={50} />
                    <ChipGroup
                        label={t('logs.feedingTray_residue', 'Leftover feed')}
                        value={residue}
                        onChange={(v) => v && setResidue(v as TrayResidue)}
                        options={(Object.keys(RESIDUE_LABEL) as TrayResidue[]).map((r) => ({ value: r, label: t(`logs.feedingTray_${r}`, RESIDUE_LABEL[r]) }))}
                    />
                    {pondId && (
                        <PhotoAttach
                            surface="feed_tray"
                            scope={{ pondId }}
                            value={photoPath ? [photoPath] : []}
                            onChange={(paths) => setPhotoPath(paths[paths.length - 1])}
                            max={1}
                        />
                    )}
                    <Button title={t('logs.saveRecord')} onPress={save} loading={saving} style={styles.saveBtn} />
                </Card>

                <Text style={styles.sectionTitle}>{t('logs.feedingTray_recent', 'Recent checks')}</Text>
                <FlatList
                    data={checks}
                    keyExtractor={(c2) => c2.id}
                    renderItem={renderItem}
                    scrollEnabled={false}
                    ListEmptyComponent={<EmptyState icon="basket-outline" title={t('logs.feedingTray_emptyTitle', 'No tray checks yet')} subtitle={t('logs.feedingTray_emptySub', 'Log a tray check to fine-tune feeding.')} />}
                />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: theme.spacing[4], borderBottomWidth: 1, borderBottomColor: c.borderDefault, backgroundColor: c.surface,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: c.textPrimary, flex: 1, textAlign: 'center' },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    subtitle: { ...theme.typeScale.bodyMedium, color: c.textSecondary, marginBottom: theme.spacing[4] },
    card: { padding: theme.spacing[4], marginBottom: theme.spacing[6] },
    saveBtn: { marginTop: theme.spacing[2] },
    sectionTitle: { ...theme.typeScale.h4, color: c.textPrimary, marginBottom: theme.spacing[3] },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[4], marginBottom: theme.spacing[2] },
    checkTitle: { ...theme.typeScale.bodyMedium, color: c.textPrimary, fontWeight: '600' },
    checkMeta: { ...theme.typeScale.caption, color: c.textSecondary },
});

export default FeedingTrayChecksScreen;
