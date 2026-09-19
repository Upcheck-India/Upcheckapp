import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { AlertBanner } from '../../components/ui/AlertBanner';
import { PondPicker } from '../../components/ui/PondPicker';
import { theme } from '../../theme';
import { LAB_LINKS, SYMPTOMS, type SymptomCategory } from '../../data/diseaseKnowledge';
import {
    MIN_SIGNS,
    findLibraryEntry,
    matchDiseases,
    signsFromLogs,
    toHealthSigns,
    type DiseaseMatch,
    type MatchBand,
} from '../../features/diseaseMatch';
import { useDiseaseLibrary } from '../../features/diseaseLibrary';
import { healthObservationsApi } from '../../api/healthObservations';
import type { PondContext } from '../../api/pondContext';

const c = theme.roles.light;
const CATEGORIES: SymptomCategory[] = ['physical', 'behavioral', 'environmental'];
const SEVERITY_COLOR: Record<string, string> = {
    high: c.dangerText,
    medium: c.warningText,
    low: c.successText,
};
const BAND_COLOR: Record<MatchBand, string> = {
    strong: c.dangerText,
    possible: c.warningText,
    weak: c.textTertiary,
};

/**
 * Honest diagnosis (spec 2026-09-19 D8): bands not percentages, ≥2 signs,
 * disclaimer first, signs pre-ticked from the pond's own logs (labelled, and
 * untickable), a lab/PCR referral on every result, and never treatment advice.
 */
export const DiagnoseScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const [pondId, setPondId] = useState<string | null>(route.params?.pondId ?? null);
    const [ctx, setCtx] = useState<PondContext | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [fromLogs, setFromLogs] = useState<string[]>([]);
    const [results, setResults] = useState<DiseaseMatch[] | null>(null);
    const [labOpen, setLabOpen] = useState(false);
    const [logFor, setLogFor] = useState<string | null>(null);
    const [logPondId, setLogPondId] = useState<string | null>(null);
    const [logNoCycle, setLogNoCycle] = useState(false);
    const library = useDiseaseLibrary();
    const fromLogsRef = useRef<string[]>([]);

    const byCategory = useMemo(() => {
        const map: Record<SymptomCategory, typeof SYMPTOMS> = { physical: [], behavioral: [], environmental: [] };
        SYMPTOMS.forEach((s) => map[s.category].push(s));
        return map;
    }, []);

    // Pre-tick what this pond's logs already show. Runs again when the pond's
    // context lands (adds low DO / high ammonia); a sign already offered once
    // is never re-ticked, so an untick sticks.
    useEffect(() => {
        if (!pondId) return;
        let alive = true;
        healthObservationsApi
            .listForPond(pondId, 3)
            .then(({ data }) => data ?? [])
            .catch(() => [])
            .then((obs) => {
                if (!alive) return;
                const found = signsFromLogs(obs, ctx);
                const added = found.filter((s) => !fromLogsRef.current.includes(s));
                if (!added.length) return;
                fromLogsRef.current = [...fromLogsRef.current, ...added];
                setFromLogs(fromLogsRef.current);
                setSelected((cur) => [...new Set([...cur, ...added])]);
            });
        return () => {
            alive = false;
        };
    }, [pondId, ctx]);

    const onPond = (id: string, context: PondContext | null) => {
        if (id !== pondId) {
            fromLogsRef.current = [];
            setFromLogs([]);
        }
        setPondId(id);
        setCtx(context);
    };

    const runDiagnosis = () => setResults(matchDiseases(selected));

    const diseaseName = (m: DiseaseMatch) => t(`diagnose.disease_${m.key}`, m.name);

    const libraryEntry = (m: DiseaseMatch) => findLibraryEntry(m.key, library.data ?? []);

    const logInPond = (m: DiseaseMatch, pond: string, cropId: string) =>
        navigation.navigate('DiseaseLog', {
            pondId: pond,
            cropId,
            diseaseId: libraryEntry(m)?.id,
            signs: toHealthSigns(selected),
        });

    const startLog = (m: DiseaseMatch) => {
        if (pondId && ctx?.cropId) {
            logInPond(m, pondId, ctx.cropId);
            return;
        }
        setLogFor(m.key);
        setLogPondId(null);
        setLogNoCycle(false);
    };

    const onLogPond = (m: DiseaseMatch) => (id: string, context: PondContext | null) => {
        setLogPondId(id);
        if (!context) return; // the context (with cropId) follows the choice
        if (context.cropId) logInPond(m, id, context.cropId);
        else setLogNoCycle(true);
    };

    const chipLabel = (id: string, label: string) =>
        fromLogs.includes(id) ? `${label} (${t('diagnose.fromLogs')})` : label;

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={c.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('diagnose.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Disclaimer FIRST, above the sign picker (D8.4). */}
                <AlertBanner type="info" title={t('diagnose.disclaimer')} />

                <Text style={styles.intro}>{t('diagnose.intro')}</Text>

                <Card style={styles.card}>
                    <Text style={styles.caption}>{t('diagnose.pondLabel')}</Text>
                    <PondPicker pondId={pondId} onChange={onPond} stockedOnly />
                    {fromLogs.length > 0 && <Text style={styles.caption}>{t('diagnose.fromLogsNote')}</Text>}
                </Card>

                {CATEGORIES.map((cat) => (
                    <Card key={cat} style={styles.card}>
                        <Text style={styles.sectionTitle}>{t(`diagnose.cat_${cat}`)}</Text>
                        <ChipGroup
                            multiple
                            value={selected}
                            onChange={setSelected}
                            options={byCategory[cat].map((s) => ({ value: s.id, label: chipLabel(s.id, t(s.labelKey, s.label)) }))}
                        />
                    </Card>
                ))}

                {selected.length < MIN_SIGNS && <Text style={styles.caption}>{t('diagnose.minSigns')}</Text>}
                <Button
                    title={t('diagnose.run')}
                    onPress={runDiagnosis}
                    disabled={selected.length < MIN_SIGNS}
                    style={styles.runBtn}
                />

                {results && (
                    <View style={styles.results}>
                        <Text style={styles.sectionTitle}>{t('diagnose.results')}</Text>
                        {results.length === 0 ? (
                            <Card style={styles.card}>
                                <Text style={styles.empty}>{t('diagnose.noMatch')}</Text>
                                <Button title={t('diagnose.confirmLab')} variant="outlined" onPress={() => setLabOpen(true)} style={styles.labBtn} />
                            </Card>
                        ) : (
                            results.map((m) => {
                                const entry = libraryEntry(m);
                                return (
                                    <Card key={m.key} style={[styles.card, m.band === 'weak' && styles.cardWeak]}>
                                        <Text style={[styles.band, { color: BAND_COLOR[m.band] }]}>{t(`diagnose.band_${m.band}`)}</Text>
                                        <Text style={styles.resultName}>{diseaseName(m)}</Text>
                                        <Text style={[styles.severity, { color: SEVERITY_COLOR[m.severity] }]}>
                                            {t(`diagnose.sev_${m.severity}`)}
                                        </Text>
                                        <View style={styles.resultActions}>
                                            {entry ? (
                                                <Button
                                                    title={t('diagnose.viewLibrary')}
                                                    variant="outlined"
                                                    onPress={() => navigation.navigate('DiseaseDetail', { diseaseId: entry.id })}
                                                    style={styles.resultBtn}
                                                />
                                            ) : null}
                                            <Button title={t('diagnose.logInPond')} onPress={() => startLog(m)} style={styles.resultBtn} />
                                        </View>
                                        <Button title={t('diagnose.confirmLab')} variant="outlined" onPress={() => setLabOpen(true)} style={styles.labBtn} />
                                        {logFor === m.key && (
                                            <View style={styles.logPicker}>
                                                <Text style={styles.caption}>{t('diagnose.pickPondForLog')}</Text>
                                                <PondPicker pondId={logPondId} onChange={onLogPond(m)} stockedOnly />
                                                {logNoCycle && <Text style={styles.caption}>{t('diagnose.noCycle')}</Text>}
                                            </View>
                                        )}
                                    </Card>
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            <Modal visible={labOpen} animationType="slide" transparent onRequestClose={() => setLabOpen(false)}>
                <View style={styles.sheetBackdrop}>
                    <View style={styles.sheet}>
                        <ScrollView>
                            <Text style={styles.sectionTitle}>{t('diagnose.lab_title')}</Text>
                            <Text style={styles.sheetText}>{t('diagnose.lab_intro')}</Text>
                            <Text style={styles.sheetText}>{t('diagnose.lab_which')}</Text>
                            <Text style={styles.sheetText}>{t('diagnose.lab_howMany')}</Text>
                            <Text style={styles.sheetText}>{t('diagnose.lab_transport')}</Text>
                            <Text style={styles.sheetText}>{t('diagnose.lab_label')}</Text>
                            <Text style={styles.sectionTitle}>{t('diagnose.lab_labs')}</Text>
                            {LAB_LINKS.map((l) => (
                                <TouchableOpacity key={l.key} onPress={() => Linking.openURL(l.url).catch(() => undefined)} accessibilityRole="link">
                                    <Text style={styles.link}>{l.name}</Text>
                                </TouchableOpacity>
                            ))}
                            <Text style={styles.caption}>{t('diagnose.lab_labsNote')}</Text>
                            <Text style={styles.caption}>{t('diagnose.lab_source')}</Text>
                            <Button title={t('diagnose.lab_close')} variant="outlined" onPress={() => setLabOpen(false)} style={styles.labBtn} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: theme.spacing[4], borderBottomWidth: 1, borderBottomColor: c.borderDefault, backgroundColor: c.surface,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: c.textPrimary },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    intro: { ...theme.typeScale.bodyMedium, color: c.textSecondary, marginVertical: theme.spacing[4] },
    caption: { ...theme.typeScale.caption, color: c.textSecondary, marginVertical: theme.spacing[2] },
    card: { marginBottom: theme.spacing[4], padding: theme.spacing[4] },
    cardWeak: { opacity: 0.7, borderWidth: 1, borderColor: c.borderDefault, borderStyle: 'dashed' },
    sectionTitle: { ...theme.typeScale.h4, color: c.textPrimary, marginBottom: theme.spacing[3] },
    runBtn: { marginTop: theme.spacing[2], marginBottom: theme.spacing[4] },
    results: { marginTop: theme.spacing[2] },
    band: { ...theme.typeScale.labelMedium, fontWeight: '700', marginBottom: theme.spacing[1] },
    resultName: { ...theme.typeScale.bodyLarge, color: c.textPrimary, fontWeight: '600' },
    severity: { ...theme.typeScale.caption, marginTop: 2 },
    resultActions: { flexDirection: 'row', gap: theme.spacing[3], marginTop: theme.spacing[3] },
    resultBtn: { flex: 1 },
    labBtn: { marginTop: theme.spacing[3] },
    logPicker: { marginTop: theme.spacing[3] },
    empty: { ...theme.typeScale.bodyMedium, color: c.textSecondary, textAlign: 'center' },
    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: { maxHeight: '85%', backgroundColor: c.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: theme.spacing[4] },
    sheetText: { ...theme.typeScale.bodyMedium, color: c.textPrimary, marginBottom: theme.spacing[3] },
    link: { ...theme.typeScale.bodyMedium, color: c.primary, textDecorationLine: 'underline', marginBottom: theme.spacing[2] },
});

export default DiagnoseScreen;
