import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { theme } from '../../theme';
import { useAppQuery } from '../../query/hooks';
import { qk } from '../../query/client';
import { useMoltWindows } from '../molt/MoltPeakBanner';
import { healthObservationsApi, levelFromCount, type HealthObservation } from '../../api/healthObservations';
import { treatmentsApi } from '../../api/treatments';
import { useIngredientsStore } from '../../features/ingredientsStore';
import { preHarvestLines, type CheckTone } from '../../features/preHarvestCheck';
import { todayLocalISODate } from '../../utils/localDate';
import { formatDate } from '../../utils/formatDate';

const TONE: Record<CheckTone, { fg: string; bg: string; icon: string }> = {
    green: { fg: theme.roles.light.successText, bg: theme.roles.light.successBg, icon: 'check-circle-outline' },
    amber: { fg: theme.roles.light.warningText, bg: theme.roles.light.warningBg, icon: 'alert-outline' },
    red: { fg: theme.roles.light.dangerText, bg: theme.roles.light.dangerBg, icon: 'alert-octagon-outline' },
};

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);

/**
 * Pre-harvest check (harvest spec M2). Warn only, never blocks: it has no
 * say over any save button. Every source is optional — offline, a failed
 * read just drops its line.
 *
 * Shown on HarvestLog (above the grades) and on HarvestPlan cards from 2 days
 * before. TODO(M2/H6): also on the Harvest Timing result for the chosen day —
 * left to H6, which is rewriting HarvestTimingScreen; it is one line there:
 * `<PreHarvestCheck pondId={pondId} cropId={cropId} date={chosenDay} />`.
 */
export const PreHarvestCheck: React.FC<{ pondId: string; cropId?: string | null; date: string }> = ({ pondId, cropId, date }) => {
    const { t } = useTranslation();
    const today = todayLocalISODate();
    // The 3 days before `date`, which may be in the past (a backdated log).
    const days = Math.max(3, Math.round((dayMs(today) - dayMs(date)) / 86_400_000) + 3);

    const { data: windows } = useMoltWindows();
    const obsQuery = useAppQuery({
        queryKey: [...qk.pond(pondId), 'healthObs', days] as const,
        queryFn: async () => (await healthObservationsApi.listForPond(pondId, days)).data,
    });
    const { data: compliance } = useAppQuery({
        queryKey: [...qk.pond(pondId), 'compliance', cropId ?? null] as const,
        enabled: !!cropId,
        queryFn: async () => (await treatmentsApi.compliance(cropId!)).data,
    });
    const ingredients = useIngredientsStore((s) => s.ingredients);

    // The inline cast-net entry, shown until something is saved.
    const [local, setLocal] = useState<HealthObservation | null>(null);
    const [soft, setSoft] = useState('');
    const [of, setOf] = useState('50');
    const [saving, setSaving] = useState(false);

    const lines = preHarvestLines({
        date,
        windows,
        observations: [...(obsQuery.data ?? []), ...(local ? [local] : [])],
        compliance,
        ingredients,
        fmt: (d) => formatDate(`${d}T12:00:00`),
    });

    const saveSoft = async () => {
        const count = parseInt(soft, 10);
        const size = parseInt(of, 10);
        if (isNaN(count) || count < 0 || !(size > 0)) return;
        const level = levelFromCount(count, size);
        setSaving(true);
        try {
            // saveRecord: queues offline, idempotent on the minted id.
            await healthObservationsApi.save({
                pondId,
                cropId: cropId ?? undefined,
                observedOn: today,
                source: 'sampling',
                sampleSize: size,
                signs: [{ sign: 'soft_shell', level, count }],
            });
            setLocal({
                id: 'local', pondId, cropId: cropId ?? null, observedOn: today, sign: 'soft_shell', level,
                sampleSize: size, count, moltDeaths: null, source: 'sampling', windowKey: null, photoUrls: [],
                createdAt: new Date().toISOString(),
            });
            void obsQuery.refetch();
        } catch {
            // Validation failure only; the check stays a prompt.
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card style={styles.card} testID="pre-harvest-check">
            <Text style={styles.title}>{t('health.check.title')}</Text>
            {lines.map((l) => {
                const tone = TONE[l.tone];
                return (
                    <View key={l.key} style={[styles.line, { backgroundColor: tone.bg }]} testID={`check-${l.key}-${l.tone}`}>
                        <View style={styles.lineRow}>
                            <MaterialCommunityIcons name={tone.icon as any} size={18} color={tone.fg} />
                            <Text style={[styles.lineText, { color: tone.fg }]}>{t(`health.check.${l.text}`, l.params)}</Text>
                        </View>
                        {l.prompt && (
                            <View style={styles.entry}>
                                <TextInput
                                    style={styles.num}
                                    value={soft}
                                    onChangeText={setSoft}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    accessibilityLabel={t('health.softCount')}
                                    testID="check-soft-count"
                                />
                                <Text style={styles.of}>{t('health.check.of')}</Text>
                                <TextInput
                                    style={styles.num}
                                    value={of}
                                    onChangeText={setOf}
                                    keyboardType="number-pad"
                                    accessibilityLabel={t('health.softOf')}
                                />
                                <Button title={t('common.save')} onPress={() => void saveSoft()} loading={saving} disabled={!soft.trim()} />
                            </View>
                        )}
                    </View>
                );
            })}
        </Card>
    );
};

const styles = StyleSheet.create({
    card: { marginBottom: theme.spacing[4] },
    title: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary, marginBottom: theme.spacing[2] },
    line: { borderRadius: theme.radius.sm, padding: theme.spacing[3], marginBottom: theme.spacing[2] },
    lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[2] },
    lineText: { ...theme.typeScale.bodySmall, flex: 1 },
    entry: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginTop: theme.spacing[2] },
    num: {
        ...theme.typeScale.bodyMedium,
        width: 56,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        borderRadius: theme.radius.sm,
        paddingVertical: theme.spacing[1],
        textAlign: 'center',
        backgroundColor: theme.roles.light.surface,
    },
    of: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
});
