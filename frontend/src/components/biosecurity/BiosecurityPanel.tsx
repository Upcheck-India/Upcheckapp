import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { theme } from '../../theme';
import { apiErrorMessage } from '../../api/errors';
import { biosecurityApi, PCR_TESTS, seedWarning, type CropBiosecurity, type SeedHealth } from '../../api/biosecurity';
import { EMPTY_SEED, SeedHealthFields } from './SeedHealthFields';

/**
 * CycleDetail's seed-health summary (editable, WRITE_MANAGEMENT) and the
 * biosecurity checklist (ticks, WRITE_OPERATIONAL, offline-first). Hidden
 * entirely until the backend migration is applied (`available: false`).
 */
export const BiosecurityPanel = ({
    cropId,
    active,
    canTick,
    canEditSeed,
}: {
    cropId: string;
    active: boolean;
    canTick: boolean;
    canEditSeed: boolean;
}) => {
    const { t } = useTranslation();
    const [data, setData] = useState<CropBiosecurity | null>(null);
    // The first load used to render nothing, then pop the cards in — farmers
    // had no clue anything was coming. Refocus refetches keep the old data.
    const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
    const [editing, setEditing] = useState(false);
    const [seedDraft, setSeedDraft] = useState<SeedHealth>(EMPTY_SEED);
    const [saving, setSaving] = useState(false);

    // Which crop the data on screen belongs to. CycleDetail is reused for a
    // different cycle, so "keep the old data on a failed refetch" must mean
    // THIS crop's old data — otherwise a single blip left the previous
    // cycle's checklist and score on screen as if they were this one's.
    const loadedFor = useRef<string | null>(null);

    const load = useCallback(() => {
        biosecurityApi
            .get(cropId)
            .then(({ data: d }) => {
                setData(d);
                loadedFor.current = cropId;
                setStatus('ready');
            })
            .catch(() => {
                if (loadedFor.current === cropId) return; // keep this crop's data
                setData(null);
                setStatus('error');
            });
    }, [cropId]);
    useFocusEffect(load);

    if (status === 'loading') {
        return (
            <Card style={styles.card}>
                <View testID="bio-loading" style={styles.stateRow}>
                    <ActivityIndicator color={theme.roles.light.primary} />
                    <Text style={styles.line}>{t('biosecurity.loading')}</Text>
                </View>
            </Card>
        );
    }
    if (status === 'error') {
        return (
            <Card style={styles.card}>
                <Text testID="bio-error" style={styles.line}>{t('biosecurity.loadFailed')}</Text>
                <Button
                    title={t('common.retry')}
                    variant="outlined"
                    onPress={() => {
                        setStatus('loading');
                        load();
                    }}
                    style={styles.btn}
                />
            </Card>
        );
    }
    if (!data?.available) return null;

    const toggle = async (key: string, done: boolean) => {
        const prev = data;
        const items = data.items.map((i) => (i.key === key ? { ...i, done } : i));
        setData({ ...data, items, done: items.filter((i) => i.done).length });
        try {
            const r = await biosecurityApi.setCheck(cropId, { itemKey: key, done });
            if (r.data) setData(r.data);
        } catch (e) {
            setData(prev);
            Alert.alert(t('common.error'), apiErrorMessage(e, t('biosecurity.saveFailed')));
        }
    };

    const saveSeed = async () => {
        setSaving(true);
        try {
            const { data: d } = await biosecurityApi.setSeed(cropId, seedDraft);
            setData(d);
            setEditing(false);
        } catch (e) {
            Alert.alert(t('common.error'), apiErrorMessage(e, t('biosecurity.saveFailed')));
        } finally {
            setSaving(false);
        }
    };

    const seed = data.seed ?? EMPTY_SEED;
    const warning = seedWarning(seed.plPcrResults);

    return (
        <>
            <Card style={styles.card}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{t('biosecurity.seedTitle')}</Text>
                    {canEditSeed && !editing && (
                        <TouchableOpacity
                            onPress={() => {
                                setSeedDraft(seed);
                                setEditing(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={t('common.edit')}
                        >
                            <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.roles.light.textPrimary} />
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.why}>{t('biosecurity.seedWhy')}</Text>
                {editing ? (
                    <>
                        <SeedHealthFields value={seedDraft} onChange={setSeedDraft} />
                        <Button title={t('common.save')} onPress={saveSeed} loading={saving} style={styles.btn} />
                        <Button title={t('common.cancel')} variant="outlined" onPress={() => setEditing(false)} />
                    </>
                ) : (
                    <>
                        <Text style={styles.line}>
                            {t('biosecurity.spf')}: {seed.plSpf == null ? '-' : t(seed.plSpf ? 'common.yes' : 'common.no')}
                        </Text>
                        {PCR_TESTS.map((k) => (
                            <Text key={k} style={styles.line}>
                                {t(`biosecurity.pcr.${k}`)}: {t(`biosecurity.result.${seed.plPcrResults?.[k] ?? 'not_tested'}`)}
                            </Text>
                        ))}
                        {(seed.plPcrLab || seed.plPcrDate) && (
                            <Text style={styles.line}>
                                {[seed.plPcrLab, seed.plPcrDate].filter(Boolean).join(' · ')}
                            </Text>
                        )}
                        {warning && (
                            <Text style={[styles.warn, warning === 'positive' && styles.danger]}>
                                {t(warning === 'positive' ? 'biosecurity.warnPositive' : 'biosecurity.warnUntested')}
                            </Text>
                        )}
                    </>
                )}
            </Card>

            <Card style={styles.card}>
                <Text style={styles.title}>
                    {t('biosecurity.progress', { done: data.done, total: data.total })}
                </Text>
                <Text style={styles.why}>{t('biosecurity.checklistWhy')}</Text>
                <Text style={styles.why}>{t('biosecurity.selfReported')}</Text>
                {(['prep', 'culture'] as const).map((stage) => (
                    <View key={stage}>
                        <Text style={styles.stage}>{t(`biosecurity.stage.${stage}`)}</Text>
                        {data.items
                            .filter((i) => i.stage === stage)
                            .map((i) => {
                                const enabled = canTick && active;
                                return (
                                    <TouchableOpacity
                                        key={i.key}
                                        testID={`bio-item-${i.key}`}
                                        style={styles.item}
                                        disabled={!enabled}
                                        onPress={() => toggle(i.key, !i.done)}
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: i.done, disabled: !enabled }}
                                    >
                                        <MaterialCommunityIcons
                                            name={i.done ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                            size={22}
                                            color={i.done ? theme.roles.light.primary : theme.roles.light.textSecondary}
                                        />
                                        <View style={styles.itemBody}>
                                            <Text style={styles.itemText}>{t(`biosecurity.item.${i.key}`)}</Text>
                                            <Text style={styles.why}>{t(`biosecurity.itemWhy.${i.key}`)}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                    </View>
                ))}
            </Card>
        </>
    );
};

const styles = StyleSheet.create({
    card: { marginBottom: theme.spacing[6] },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, marginBottom: theme.spacing[3] },
    line: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, marginBottom: theme.spacing[1] },
    stage: {
        ...theme.typeScale.overline,
        color: theme.roles.light.textTertiary,
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[1],
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[2], minHeight: 44 },
    itemBody: { flex: 1 },
    itemText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
    why: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[1] },
    stateRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] },
    warn: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.warningText,
        backgroundColor: theme.roles.light.warningBg,
        padding: theme.spacing[3],
        borderRadius: theme.radius.sm,
        marginTop: theme.spacing[2],
    },
    danger: { color: theme.roles.light.dangerText, backgroundColor: theme.roles.light.dangerBg },
    btn: { marginTop: theme.spacing[3], marginBottom: theme.spacing[2] },
});
